# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

import json
from collections import namedtuple
from flask import request, flash, session, url_for, redirect, g
from flask.views import View
from ggrc import settings
from ggrc.app import app
from ggrc.rbac import permissions
from ggrc.login import get_current_user
from ggrc.utils import as_json
from ggrc.builder.json import publish
from werkzeug.exceptions import Forbidden
from . import filters
from .common import BaseObjectView, RedirectedPolymorphView
from .tooltip import TooltipView
from ggrc.models.task import Task, queued_task, create_task, make_task_response

"""ggrc.views
Handle non-RESTful views, e.g. routes which return HTML rather than JSON
"""

def get_permissions_json():
  permissions.permissions_for(permissions.get_user())
  return json.dumps(getattr(g, '_request_permissions', None))

def get_config_json():
  public_config = dict(app.config.public_config)
  if hasattr(g, 'public_config'):
    public_config.update(g.public_config)
  return json.dumps(public_config)

def get_current_user_json():
  current_user = get_current_user()
  return as_json(current_user.log_json())

@app.context_processor
def base_context():
  from ggrc.models import get_model
  return dict(
      get_model=get_model,
      permissions_json=get_permissions_json,
      permissions=permissions,
      config_json=get_config_json,
      current_user_json=get_current_user_json,
      )

from flask import render_template

# Actual HTML-producing routes
#

@app.route("/")
def index():
  """The initial entry point of the app
  """
  return render_template("welcome/index.haml")

from ggrc.login import login_required

@app.route("/dashboard")
@login_required
def dashboard():
  """The dashboard page
  """
  return render_template("dashboard/index.haml")

def generate_query_chunks(query):
  CHUNK_SIZE = 100
  count = query.count()
  for offset in range(0, count, CHUNK_SIZE):
    yield query.order_by('id').limit(CHUNK_SIZE).offset(offset).all()

# Needs to be secured as we are removing @login_required
@app.route("/tasks/reindex", methods=["POST"])
@queued_task
def reindex(task):
  """
  Web hook to update the full text search index
  """

  from ggrc.fulltext import get_indexer
  from ggrc.fulltext.recordbuilder import fts_record_for, model_is_indexed

  indexer = get_indexer()
  indexer.delete_all_records(False)

  from ggrc.models import all_models
  from ggrc.app import db

  # Find all models then remove base classes
  #   (If we don't remove base classes, we get duplicates in the index.)
  inheritance_base_models = [
      all_models.Directive, all_models.SystemOrProcess, all_models.Response
      ]
  models = set(all_models.all_models) - set(inheritance_base_models)
  models = [model for model in models if model_is_indexed(model)]

  for model in models:
    mapper_class = model._sa_class_manager.mapper.base_mapper.class_
    query = model.query.options(
        db.undefer_group(mapper_class.__name__ + '_complete'),
        )
    for query_chunk in generate_query_chunks(query):
      for instance in query_chunk:
        indexer.create_record(fts_record_for(instance), False)
      db.session.commit()

  return app.make_response((
    'success', 200, [('Content-Type', 'text/html')]))

@app.route("/admin/reindex", methods=["POST"])
@login_required
def admin_reindex():
  """Calls a webhook that reindexes indexable objects
  """
  from ggrc import settings
  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()
  tq = create_task("reindex", reindex)
  return tq.make_response(app.make_response(("scheduled %s" % tq.name,
                                            200,
                                            [('Content-Type', 'text/html')])))

@app.route("/admin")
@login_required
def admin():
  """The admin dashboard page
  """
  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()
  return render_template("admin/index.haml")

@app.route("/design/with_new_layout")
@login_required
def styleguide_with_new_layout():
  """The style guide page with the new layout
  """
  return render_template("styleguide/styleguide_with_new_layout.haml")

@app.route("/design")
@login_required
def styleguide():
  """The style guide page
  """
  return render_template("styleguide/styleguide.haml")

def allowed_file(filename):
  return filename.rsplit('.', 1)[1] == 'csv'

ADMIN_KIND_TEMPLATES = {
  "processes": "Process_Import_Template.csv",
  "systems": "System_Import_Template.csv",
  "admin": "People_Import_Template.csv",
}

@app.route("/<admin_kind>/import_template", methods=['GET'])
def process_import_template(admin_kind):
  from flask import current_app
  if admin_kind in ADMIN_KIND_TEMPLATES:
    filename = ADMIN_KIND_TEMPLATES[admin_kind]
    headers = [('Content-Type', 'text/csv'), ('Content-Disposition', 'attachment; filename="{}"'.format(filename))]
    body = render_template("csv_files/" + filename)
    return current_app.make_response((body, 200, headers))
  return current_app.make_response((
      "No template for that type.", 404, []))

@app.route("/programs/<program_id>/import_template", methods=['GET'])
def system_program_import_template(program_id):
  from flask import current_app
  from ggrc.models import Program
  program = Program.query.get(program_id)
  if program:
    template_name = "System_Program_Import_Template.csv"
    headers = [('Content-Type', 'text/csv'), ('Content-Disposition', 'attachment; filename="{}"'.format(template_name))]
    options = {"program_slug": program.slug}
    body = render_template("csv_files/" + template_name, **options)
    return current_app.make_response((body, 200, headers))
  return current_app.make_response((
      "No such program.", 404, []))

@app.route("/tasks/import_people", methods=['POST'])
@queued_task
def import_people_task(task):
  from ggrc.converters.common import ImportException
  from ggrc.converters.people import PeopleConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Person
  import ggrc.views

  csv_file = task.parameters.get("csv_file")
  dry_run = task.parameters.get("dry_run")
  try:
    options = {}
    options['dry_run'] = dry_run
    converter = handle_csv_import(PeopleConverter, csv_file.splitlines(True), **options)
    if dry_run:
      options['converter'] = converter
      options['results'] = converter.objects
      options['heading_map'] = converter.object_map
      return render_template("people/import_result.haml", **options)
    else:
      count = len(converter.objects)
      return import_redirect("/admin/people_redirect/{}".format(count))

  except ImportException as e:
    if e.show_preview:
      converter = e.converter
      return render_template("people/import_result.haml", exception_message=e,
          converter=converter, results=converter.objects, heading_map=converter.object_map)
    return render_template("directives/import_errors.haml",
          directive_id="People", exception_message=str(e))

@app.route("/admin/people_redirect/<count>", methods=["GET"])
def people_redirect(count):
  flash(u'Successfully imported {} person{}'.format(count, 's' if count > 1 else ''), 'notice')
  return redirect("/admin")

@app.route("/admin/import_people", methods=['GET', 'POST'])
def import_people():

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  if request.method != 'POST':
    return render_template("people/import.haml", import_kind='People')

  if 'cancel' in request.form:
    return import_redirect("/admin")

  dry_run = not ('confirm' in request.form)
  csv_file = request.files['file']

  if csv_file and allowed_file(csv_file.filename):
    from werkzeug.utils import secure_filename
    filename = secure_filename(csv_file.filename)
  else:
    file_msg = "Could not import: invalid csv file."
    return render_template("directives/import_errors.haml",
        directive_id="People", exception_message=file_msg)

  parameters = {"dry_run": dry_run,
                "csv_file": csv_file.read(),
                "csv_filename": filename}
  tq = create_task("import_people", import_people_task, parameters)
  return tq.make_response(import_dump({"id":tq.id, "status":tq.status}))

@app.route("/standards/<directive_id>/import_controls", methods=['GET', 'POST'])
@app.route("/regulations/<directive_id>/import_controls", methods=['GET', 'POST'])
@app.route("/policies/<directive_id>/import_controls", methods=['GET', 'POST'])
@app.route("/contracts/<directive_id>/import_controls", methods=['GET', 'POST'])
def import_controls(directive_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.controls import ControlsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Directive
  from ggrc.utils import view_url_for

  directive = Directive.query.get(directive_id)
  directive_url = view_url_for(directive)
  return_to = unicode(request.args.get('return_to', directive_url))

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect(return_to)
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        options = {}
        options['parent_type'] = Directive
        options['parent_id'] = int(directive_id)
        options['dry_run'] = dry_run
        converter = handle_csv_import(ControlsConverter, csv_file, **options)
        if dry_run:
          options['converter'] = converter
          options['results'] = converter.objects
          options['heading_map'] = converter.object_map
          return render_template("directives/import_controls_result.haml", **options)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} control{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect(return_to)
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml",
            directive_id=directive_id, exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("directives/import_controls_result.haml",
            exception_message=e, converter=converter, results=converter.objects,
            directive_id=int(directive_id), heading_map=converter.object_map)
      return render_template("directives/import_errors.haml",
          directive_id=directive_id, exception_message=str(e))

  return render_template("directives/import.haml", directive_id=directive_id, import_kind='Controls', return_to=return_to, parent_type=(directive.kind or directive.meta_kind))

@app.route("/standards/<directive_id>/import_objectives", methods=['GET', 'POST'])
@app.route("/regulations/<directive_id>/import_objectives", methods=['GET', 'POST'])
@app.route("/policies/<directive_id>/import_objectives", methods=['GET', 'POST'])
@app.route("/contracts/<directive_id>/import_objectives", methods=['GET', 'POST'])
def import_objectives(directive_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.objectives import ObjectivesConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Directive
  from ggrc.utils import view_url_for

  directive = Directive.query.get(directive_id)
  directive_url = view_url_for(directive)
  return_to = unicode(request.args.get('return_to', directive_url))

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect(return_to)
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        options = {}
        options['parent_type'] = Directive
        options['parent_id'] = int(directive_id)
        options['dry_run'] = dry_run
        converter = handle_csv_import(ObjectivesConverter, csv_file, **options)
        if dry_run:
          options['converter'] = converter
          options['results'] = converter.objects
          options['heading_map'] = converter.object_map
          return render_template("directives/import_objectives_result.haml", **options)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} objective{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect(return_to)
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml",
            directive_id=directive_id, exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("directives/import_objectives_result.haml",
            exception_message=e, converter=converter, results=converter.objects,
            directive_id=int(directive_id), heading_map=converter.object_map)
      return render_template("directives/import_errors.haml",
          directive_id=directive_id, exception_message=str(e))

  return render_template("directives/import.haml", directive_id=directive_id, import_kind='Objectives', return_to=return_to, parent_type=(directive.kind or directive.meta_kind))

@app.route("/programs/<program_id>/import_controls", methods=['GET', 'POST'])
def import_controls_to_program(program_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.controls import ControlsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Program
  from ggrc.utils import view_url_for

  program = Program.query.get(program_id)
  program_url = view_url_for(program)
  return_to = unicode(request.args.get('return_to', program_url))

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect(return_to)
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        options = {}
        options['parent_type'] = Program
        options['parent_id'] = int(program_id)
        options['dry_run'] = dry_run
        converter = handle_csv_import(ControlsConverter, csv_file, **options)
        if dry_run:
          options['converter'] = converter
          options['results'] = converter.objects
          options['heading_map'] = converter.object_map
          return render_template("programs/import_controls_result.haml", **options)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} control{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect(return_to)
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("programs/import_errors.haml",
            program_id=program_id, exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("programs/import_controls_result.haml",
            exception_message=e, converter=converter, results=converter.objects,
            program_id=int(program_id), heading_map=converter.object_map)
      return render_template("programs/import_errors.haml",
          program_id=program_id, exception_message=str(e))

  return render_template("programs/import_controls.haml", program_id=program_id, import_kind='Controls', return_to=return_to, parent_type="Program")


@app.route("/audits/<audit_id>/import_pbcs", methods=['GET', 'POST'])
def import_requests(audit_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.requests import RequestsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Audit, Program
  from ggrc.utils import view_url_for

  audit = Audit.query.get(audit_id)
  program = audit.program
  program_url = view_url_for(program)
  return_to = unicode(request.args.get('return_to', program_url))

  if request.method == 'POST':

    if 'cancel' in request.form:
      return import_redirect(return_to)
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(RequestsConverter, csv_file,
          program=program, audit=audit, dry_run=dry_run)

        if dry_run:
          return render_template("programs/import_request_result.haml",
              converter=converter,
              results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} request{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect(return_to)
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("programs/import_request_errors.haml",
              exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("programs/import_request_result.haml", exception_message=e,
            converter=converter, results=converter.objects,
            heading_map=converter.object_map)
      return render_template("programs/import_request_errors.haml",
            exception_message=e)

  return render_template("programs/import_request.haml", import_kind='Requests', return_to=return_to)


@app.route("/audits/<audit_id>/import_pbc_template", methods=['GET'])
def import_requests_template(audit_id):
  from flask import current_app
  from ggrc.models.all_models import Audit, Program
  audit = Audit.query.get(audit_id)
  program = audit.program
  template = "Request_Import_Template.csv"
  filename = "PBC Request Import Template.csv"
  headers = [('Content-Type', 'text/csv'), ('Content-Disposition', 'attachment; filename="{}"'.format(filename))]
  options = {'program_slug': program.slug}
  body = render_template("csv_files/" + template, **options)
  return current_app.make_response((body, 200, headers))

@app.route("/standards/<directive_id>/import_sections", methods=['GET', 'POST'])
@app.route("/regulations/<directive_id>/import_sections", methods=['GET', 'POST'])
@app.route("/policies/<directive_id>/import_sections", methods=['GET', 'POST'])
@app.route("/contracts/<directive_id>/import_clauses", methods=['GET', 'POST'])
def import_sections(directive_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.sections import SectionsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Directive, Contract
  from ggrc.utils import view_url_for

  directive = Directive.query.get(directive_id)
  directive_url = view_url_for(directive)
  return_to = unicode(request.args.get('return_to', directive_url))
  if isinstance(directive, Contract):
    import_kind = "Clauses"
  else:
    import_kind = "Sections"

  if request.method == 'POST':

    if 'cancel' in request.form:
      return import_redirect(return_to)
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(SectionsConverter, csv_file,
          directive_id=directive_id, dry_run=dry_run)

        if dry_run:
          return render_template("directives/import_sections_result.haml",
              directive_id=int(directive_id), converter=converter,
              results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {0} {2}{1}'.format(
              count, 's' if count > 1 else '', import_kind[:-1]), 'notice')
          return import_redirect(return_to)
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml",
              directive_id=directive_id, exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("directives/import_sections_result.haml", exception_message=e,
            converter=converter, results=converter.objects,
            directive_id=int(directive_id), heading_map=converter.object_map)
      return render_template("directives/import_errors.haml",
            directive_id=int(directive_id), exception_message=e)

  return render_template(
      "directives/import.haml", directive_id=directive_id, import_kind=import_kind, return_to=return_to)

@app.route("/systems/import", methods=['GET', 'POST'])
def import_systems():
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_csv_import

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect('/admin')
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(SystemsConverter, csv_file, dry_run=dry_run)
        if dry_run:
          return render_template("systems/import_result.haml",
            converter=converter, results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} system{}'.format(count, 's' if count > 1 else ''), 'notice')
          return import_redirect("/admin")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml", exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("systems/import_result.haml", exception_message=e,
            converter=converter, results=converter.objects, heading_map=converter.object_map)
      return render_template("directives/import_errors.haml", exception_message=e)

  return render_template("systems/import.haml", import_kind='Systems')

@app.route("/programs/<program_id>/import_systems", methods=['GET', 'POST'])
def import_systems_to_program(program_id):
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_csv_import
  from ggrc.models import Program
  from ggrc.utils import view_url_for

  program = Program.query.get(program_id)
  program_url = view_url_for(program)
  return_to = unicode(request.args.get('return_to', program_url))

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect(return_to)
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        options = {
            "dry_run": dry_run,
            "parent_type": Program,
            "parent_id": program_id,
        }
        converter = handle_csv_import(SystemsConverter, csv_file, **options)
        if dry_run:
          return render_template("systems/import_result.haml",
            converter=converter, results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(
              u'Successfully imported {0} system{1} to {2}'.format(
                  count,
                  's' if count > 1 else '',
                  program.display_name
              ),
              'notice'
          )
          return import_redirect(return_to)
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml", exception_message=file_msg)

    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("systems/import_result.haml", exception_message=e,
            converter=converter, results=converter.objects, heading_map=converter.object_map)
      return render_template("directives/import_errors.haml", exception_message=e)

  return render_template("systems/import.haml", import_kind='Systems')

def import_dump(data):
  # The textarea here is a custom response for 'remoteipart' to
  # proxy a JSON response through an iframe.
  return app.make_response((
    '<textarea data-type="application/json" response-code="200">{0}</textarea>'.format(
      json.dumps(data)), 200, [('Content-Type', 'text/html')]))

def import_redirect(location):
  # The textarea here is a custom response for 'remoteipart' to
  # proxy a JSON response through an iframe.
  return app.make_response((
    '<textarea data-type="application/json" response-code="200">{0}</textarea>'.format(
      json.dumps({ 'location': location })), 200, [('Content-Type', 'text/html')]))

@app.route("/processes/import", methods=['GET', 'POST'])
def import_processes():
  from werkzeug import secure_filename
  from ggrc.converters.common import ImportException
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_csv_import

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  if request.method == 'POST':
    if 'cancel' in request.form:
      return import_redirect('/admin')
    dry_run = not ('confirm' in request.form)
    csv_file = request.files['file']
    try:
      if csv_file and allowed_file(csv_file.filename):
        filename = secure_filename(csv_file.filename)
        converter = handle_csv_import(SystemsConverter, csv_file, dry_run=dry_run, is_biz_process='1')
        if dry_run:
          return render_template("systems/import_result.haml",
            converter=converter, results=converter.objects, heading_map=converter.object_map)
        else:
          count = len(converter.objects)
          flash(u'Successfully imported {} process{}'.format(count, 'es' if count > 1 else ''), 'notice')
          return import_redirect("/admin")
      else:
        file_msg = "Could not import: invalid csv file."
        return render_template("directives/import_errors.haml", exception_message=file_msg)
    except ImportException as e:
      if e.show_preview:
        converter = e.converter
        return render_template("systems/import_result.haml", exception_message=e,
            converter=converter, results=converter.objects, heading_map=converter.object_map)
      return render_template("directives/import_errors.haml", exception_message=e)

  return render_template("systems/import.haml", import_kind='Processes')

@app.route("/processes/export", methods=['GET'])
def export_processes():
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Process

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  options = {}
  options['export'] = True
  options['is_biz_process'] = '1'
  procs = Process.query.all()
  filename = "PROCESSES.csv"
  return handle_converter_csv_export(filename, procs, SystemsConverter, **options)

@app.route("/tasks/export_people", methods=['POST'])
@queued_task
def export_people_task(task):
  from ggrc.converters.people import PeopleConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Person
  options = {}
  options['export'] = True
  people = Person.query.all()
  filename = "PEOPLE.csv"
  return handle_converter_csv_export(filename, people, PeopleConverter, **options)

@app.route("/admin/export_people", methods=['GET'])
def export_people():
  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  tq = create_task("export_people", export_people_task)
  return import_dump({"id":tq.id, "status":tq.status})

@app.route("/task/<id_task>", methods=['GET'])
def get_task_response(id_task):
  return make_task_response(id_task)

@app.route("/systems/export", methods=['GET'])
def export_systems():
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import System

  if not permissions.is_allowed_read("/admin", 1):
    raise Forbidden()

  options = {}
  options['export'] = True
  systems = System.query.filter_by(is_biz_process=False).all()
  filename = "SYSTEMS.csv"
  return handle_converter_csv_export(filename, systems, SystemsConverter, **options)

@app.route("/standards/<directive_id>/export_sections", methods=['GET'])
@app.route("/regulations/<directive_id>/export_sections", methods=['GET'])
@app.route("/policies/<directive_id>/export_sections", methods=['GET'])
@app.route("/contracts/<directive_id>/export_clauses", methods=['GET'])
def export_sections(directive_id):
  from ggrc.converters.sections import SectionsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Directive

  options = {}
  directive = Directive.query.filter_by(id=int(directive_id)).first()
  options['directive'] = directive
  options['export'] = True
  filename = "{}.csv".format(directive.slug)
  return handle_converter_csv_export(filename, directive.sections, SectionsConverter, **options)

@app.route("/standards/<directive_id>/export_objectives", methods=['GET'])
@app.route("/regulations/<directive_id>/export_objectives", methods=['GET'])
@app.route("/policies/<directive_id>/export_objectives", methods=['GET'])
@app.route("/contracts/<directive_id>/export_objectives", methods=['GET'])
def export_objectives(directive_id):
  from ggrc.converters.objectives import ObjectivesConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Directive, Objective

  directive = Directive.query.get(directive_id)
  options = {
      'parent_type': directive.__class__,
      'parent_id': directive_id,
      'export': True,
  }
  filename = "{}-objectives.csv".format(directive.slug)
  if 'ids' in request.args:
    ids = request.args['ids'].split(",")
    objectives = Objective.query.filter(Objective.id.in_(ids))
  else:
    objectives = directive.objectives
  return handle_converter_csv_export(filename, objectives, ObjectivesConverter, **options)

@app.route("/standards/<directive_id>/import_sections_template", methods=['GET'])
@app.route("/regulations/<directive_id>/import_sections_template", methods=['GET'])
@app.route("/policies/<directive_id>/import_sections_template", methods=['GET'])
@app.route("/contracts/<directive_id>/import_clauses_template", methods=['GET'])
def import_directive_sections_template(directive_id):
  from flask import current_app
  from ggrc.models.all_models import Directive
  directive = Directive.query.filter_by(id=int(directive_id)).first()
  directive_type = directive.type
  DIRECTIVE_TYPES = ['Contract', 'Regulation', 'Standard', 'Policy']
  if directive_type not in DIRECTIVE_TYPES:
    return current_app.make_response((
        "No template for that type.", 404, []))
  if directive_type == "Contract":
    section_term = "Clause"
  else:
    section_term = "Section"
  output_filename = "{0}_{1}_Import_Template.csv".format(
      directive_type, section_term)
  headers = [('Content-Type', 'text/csv'), ('Content-Disposition', 'attachment; filename="{}"'.format(output_filename))]
  options = {
    'section_term': section_term,
    'directive_type': directive_type,
    'directive_slug': directive.slug,
  }
  body = render_template("csv_files/Section_Import_Template.csv", **options)
  return current_app.make_response((body, 200, headers))

@app.route("/standards/<directive_id>/import_objectives_template", methods=['GET'])
@app.route("/regulations/<directive_id>/import_objectives_template", methods=['GET'])
@app.route("/policies/<directive_id>/import_objectives_template", methods=['GET'])
@app.route("/contracts/<directive_id>/import_objectives_template", methods=['GET'])
def import_directive_objectives_template(directive_id):
  from flask import current_app
  from ggrc.models.all_models import Directive
  DIRECTIVE_TYPES = ['Contract', 'Regulation', 'Standard', 'Policy']
  directive = Directive.query.get(directive_id)
  directive_kind = directive.__class__.__name__
  if directive_kind not in DIRECTIVE_TYPES:
    return current_app.make_response((
        "No template for that type.", 404, []))
  template_name = "Objective_Import_Template.csv"
  filename = "{0}_{1}".format(directive_kind, template_name)
  headers = [('Content-Type', 'text/csv'), ('Content-Disposition', 'attachment; filename="{}"'.format(filename))]
  options = {
    # (Policy/Standard/Regulation/Contract) Code
    'object_kind': directive_kind,
    'object_slug': directive.slug,
  }
  body = render_template("csv_files/" + template_name, **options)
  return current_app.make_response((body, 200, headers))

@app.route("/audits/<audit_id>/export_pbcs", methods=['GET'])
def export_requests(audit_id):
  from ggrc.converters.requests import RequestsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Audit, Request

  options = {}
  audit = Audit.query.get(audit_id)
  program = audit.program
  options['program'] = program
  filename = "{}-requests.csv".format(program.slug)
  if 'ids' in request.args:
    ids = request.args['ids'].split(",")
    requests = Request.query.filter(Request.id.in_(ids))
  else:
    requests = audit.requests
  options['export'] = True
  return handle_converter_csv_export(filename, requests, RequestsConverter, **options)

@app.route("/standards/<directive_id>/export_controls", methods=['GET'])
@app.route("/regulations/<directive_id>/export_controls", methods=['GET'])
@app.route("/policies/<directive_id>/export_controls", methods=['GET'])
@app.route("/contracts/<directive_id>/export_controls", methods=['GET'])
def export_controls(directive_id):
  from ggrc.converters.controls import ControlsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Directive, Control

  directive = Directive.query.filter_by(id=int(directive_id)).first()
  options = {
      'export': True,
      'parent_type': directive.__class__,
      'parent_id': directive_id,
  }
  filename = "{}-controls.csv".format(directive.slug)
  if 'ids' in request.args:
    ids = request.args['ids'].split(",")
    controls = Control.query.filter(Control.id.in_(ids))
  else:
    controls = directive.controls
  return handle_converter_csv_export(filename, controls, ControlsConverter, **options)

@app.route("/programs/<program_id>/export_controls", methods=['GET'])
def export_controls_from_program(program_id):
  from ggrc.converters.controls import ControlsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Program, Control

  program = Program.query.filter_by(id=int(program_id)).first()
  options = {
      'export': True,
      'parent_type': Program,
      'parent_id': program_id,
  }
  filename = "{}-controls.csv".format(program.slug)
  if 'ids' in request.args:
    ids = request.args['ids'].split(",")
    controls = Control.query.filter(Control.id.in_(ids))
  else:
    controls = program.controls
  return handle_converter_csv_export(filename, controls, ControlsConverter, **options)

@app.route("/programs/<program_id>/export_systems", methods=['GET'])
def export_systems_from_program(program_id):
  from ggrc.converters.systems import SystemsConverter
  from ggrc.converters.import_helper import handle_converter_csv_export
  from ggrc.models.all_models import Program, System

  program = Program.query.get(program_id)
  options = {
      'export': True,
      'parent_type': Program,
      'parent_id': program_id
  }
  filename = "{}-systems.csv".format(program.slug)
  if 'ids' in request.args:
    ids = request.args['ids'].split(",")
    systems = System.query.filter(System.id.in_(ids))
  else:
    # if no id list given, look up from which relationships of this
    # program have a System as destination
    systems = [r.System_destination for r in program.related_destinations if r.System_destination]
  return handle_converter_csv_export(filename, systems, SystemsConverter, **options)

@app.route("/<object_type>/<object_id>/import_controls_template", methods=['GET'])
def import_controls_template(object_type, object_id):
  from flask import current_app
  from ggrc.models.all_models import Directive, Program
  DIRECTIVE_TYPES = ["regulations", "contracts", "policies"]
  OTHER_TYPES = ["programs"]
  if object_type in DIRECTIVE_TYPES + OTHER_TYPES:
    if object_type in DIRECTIVE_TYPES:
      parent_object = Directive.query.get(object_id)
      parent_kind = parent_object.meta_kind
    else:
      parent_object = Program.query.get(object_id)
      parent_kind = "Program"
  else:
    return current_app.make_response(
        ("No template for that type.", 404, []))
  template_name = "Control_Import_Template.csv"
  headers = [
      ('Content-Type', 'text/csv'),
      (
          'Content-Disposition',
          'attachment; filename="{0}_{1}"'.format(
              parent_kind,
              template_name
          )
      )
  ]
  options = {
    # (Policy/Regulation/Contract) Code
    'object_kind': parent_kind,
    'object_slug': parent_object.slug,
  }
  body = render_template("csv_files/" + template_name, **options)
  return current_app.make_response((body, 200, headers))

ViewEntry = namedtuple('ViewEntry', 'url model_class service_class')

def object_view(model_class, base_service_class=BaseObjectView):
  return ViewEntry(
      model_class._inflector.table_plural,
      model_class,
      base_service_class)

def tooltip_view(model_class, base_service_class=TooltipView):
  return object_view(model_class, base_service_class=base_service_class)

def all_object_views():
  from ggrc import models
  return [
      object_view(models.Task),
      object_view(models.Program),
      object_view(models.Directive, RedirectedPolymorphView),
      object_view(models.Contract),
      object_view(models.Policy),
      object_view(models.Regulation),
      object_view(models.Standard),
      object_view(models.Control),
      object_view(models.Objective),
      object_view(models.System),
      object_view(models.Process),
      object_view(models.Product),
      object_view(models.Request),
      object_view(models.OrgGroup),
      object_view(models.Facility),
      object_view(models.Market),
      object_view(models.Project),
      object_view(models.DataAsset),
      object_view(models.RiskyAttribute),
      object_view(models.Risk),
      object_view(models.Person),
      ]

def all_tooltip_views():
  from ggrc import models
  return [
      tooltip_view(models.Audit),
      tooltip_view(models.Program),
      tooltip_view(models.Contract),
      tooltip_view(models.Policy),
      tooltip_view(models.Regulation),
      tooltip_view(models.Standard),
      tooltip_view(models.Control),
      tooltip_view(models.Objective),
      tooltip_view(models.System),
      tooltip_view(models.Process),
      tooltip_view(models.Product),
      tooltip_view(models.Request),
      tooltip_view(models.OrgGroup),
      tooltip_view(models.Facility),
      tooltip_view(models.Market),
      tooltip_view(models.Project),
      tooltip_view(models.DataAsset),
      tooltip_view(models.RiskyAttribute),
      tooltip_view(models.Risk),
      tooltip_view(models.Person),
      tooltip_view(models.Event),
      ]

def init_all_object_views(app):
  import sys
  from ggrc import settings

  for entry in all_object_views():
    entry.service_class.add_to(
      app,
      '/{0}'.format(entry.url),
      entry.model_class,
      decorators=(login_required,)
      )

  for entry in all_tooltip_views():
    entry.service_class.add_to(
      app,
      '/{0}'.format(entry.url),
      entry.model_class,
      decorators=(login_required,)
      )

  for extension_module in settings.get_extension_modules().values():
    if hasattr(extension_module, 'initialize_all_object_views'):
      extension_module.initialize_all_object_views(app)

# Mockups HTML pages are listed here
@app.route("/mockups")
@login_required
def mockup():
  """The mockup guide page
  """
  return render_template("mockups/index.html")
  
@app.route("/mockups/assessments")
@login_required
def assessments():
  """The assessments guide page
  """
  return render_template("mockups/assessments.html")
