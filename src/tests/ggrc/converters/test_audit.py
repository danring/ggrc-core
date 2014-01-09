# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from datetime import date, datetime
from os.path import abspath, dirname, join

from mock import patch

from ggrc import db
from ggrc.models.all_models import Audit, Objective, Person, Program, Request
from ggrc.converters.import_helper import handle_csv_import
from ggrc.converters.common import ImportException
from ggrc.converters.requests import RequestsConverter
from tests.ggrc import TestCase

THIS_ABS_PATH = abspath(dirname(__file__))
CSV_DIR = join(THIS_ABS_PATH, 'comparison_csvs/')


class TestRequest(TestCase):
  def setUp(self):
    super(TestRequest, self).setUp()
    self.patcher = patch('ggrc.converters.base.log_event')
    self.mock_log = self.patcher.start()
    self.date1 = date(2013, 9, 25)
    self.date2 = date(2013, 9, 26)
    self.date3 = date(2013, 9, 5)
    self.person3= Person(name="Requestor Person", email="requester@example.com")
    db.session.add(self.person3)
    db.session.commit()

  def tearDown(self):
    self.patcher.stop()
    super(TestRequest, self).tearDown()

  def test_new_and_existing(self):
    csv_filename = join(CSV_DIR, "request_import.csv")
    objective1 = Objective(slug="OBJ-1", title="Objective 1")
    person1 = Person(name="Assignee Person", email="assignee@example.com")
    person2= Person(name="Audit Contact Person", email="contact@example.com")
    prog1 = Program(slug="PROG-1", title="Program 1")
    audit1 = Audit(slug="AUD-1", title="Audit 1", status="Planned", program=prog1, contact=person2)
    request1 = Request(slug="REQ-1", title="Request 1", requestor=self.person3, assignee=person1, request_type=u'documentation', status='Draft', requested_on=self.date3, due_on=self.date2, audit=audit1)
    objs = [objective1, person1, person2, prog1, audit1, request1]
    [db.session.add(obj) for obj in objs]
    db.session.commit()
    options = {
        'program': prog1,
        'audit': audit1,
        'dry_run': False,
    }

    expected_request_slugs = set(["REQ-1","REQ-2"])
    expected_due_dates = set([self.date1])
    expected_statuses = set(["Amended Request", "Requested"])
    handle_csv_import(RequestsConverter, csv_filename, **options)
    db_program = Program.query.filter_by(slug="PROG-1").first()
    actual_requests = set(db_program.audits[0].requests)
    actual_request_slugs = set([x.slug for x in actual_requests])
    actual_due_dates = set([x.due_on for x in actual_requests])
    actual_statuses = set([x.status for x in actual_requests])
    # Verify that first one is updated and second is added
    self.assertEqual(expected_request_slugs, actual_request_slugs)
    self.assertEqual(expected_due_dates, actual_due_dates)
    self.assertEqual(expected_statuses, actual_statuses)

