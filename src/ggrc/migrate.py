# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import os.path
import sys
from alembic import command, util, autogenerate as autogen
from alembic.config import Config, CommandLine
from alembic.environment import EnvironmentContext
from alembic.script import ScriptDirectory
from ggrc import settings
import ggrc.app
from ggrc.extensions import get_extension_module, get_extension_modules

class ExtensionPackageEnv(object):
  def __init__(self, extension_module_name):
    self.extension_module = get_extension_module(extension_module_name)
    self.config = make_extension_config(self.extension_module)
    self.script_dir = ScriptDirectory.from_config(self.config)
    # Override location of `versions` directory to be independent of `env.py`
    self.script_dir.versions = os.path.join(
        get_extension_migrations_dir(self.extension_module), 'versions')

  def run_env(self, fn, **kwargs):
    with EnvironmentContext(
        self.config,
        self.script_dir,
        fn=fn,
        version_table=extension_version_table(self.extension_module),
        **kwargs):
      self.script_dir.run_env()

def get_extension_dir(module):
  return os.path.dirname(os.path.abspath(module.__file__))

def get_extension_migrations_dir(module):
  return os.path.join(
      get_extension_dir(module),
      'migrations',
      )

def get_base_migrations_dir():
  import ggrc
  return get_extension_migrations_dir(ggrc)

def get_base_config_file():
  return os.path.join(get_base_migrations_dir(), 'alembic.ini')

def make_extension_config(module):
  config = Config(get_base_config_file())
  # If the extension module contains a `migrations/env.py`, then use that,
  #   otherwise use `ggrc/migrations/env.py`
  module_script_location = get_extension_migrations_dir(module)
  if os.path.exists(os.path.join(module_script_location, 'env.py')):
    script_location = module_script_location
  else:
    script_location = get_base_migrations_dir()
  config.set_main_option(
      'script_location',
      script_location
      )
  return config

def extension_version_table(module):
  module_name = module if type(module) is str else module.__name__
  return '{0}_alembic_version'.format(module_name)

def extension_migrations_list():
  ret = []
  for extension_module in get_extension_modules():
    migrations_dir = get_extension_migrations_dir(extension_module)
    if os.path.exists(migrations_dir):
      ret.append(migrations_dir)
  return ret

def run_simple_command(extension_module_name, cmd, *args, **kwargs):
  pkg_env = ExtensionPackageEnv(extension_module_name)
  cmd(pkg_env.config, *args, **kwargs)

def list_templates(extension_module_name):
  run_simple_command(extension_module_name, command.list_templates)

def init(extension_module_name, **kwargs):
  pkg_env = ExtensionPackageEnv(extension_module_name)
  command.init(pkg_env.config, pkg_env.script_dir, **kwargs)

def revision_command(extension_module_name, message=None, autogenerate=False, sql=False, **kwargs):
    """Create a new revision file."""
    pkg_env = ExtensionPackageEnv(extension_module_name)
    config = pkg_env.config

    # The rest of this method is a direct copy of alembic.command:revision,
    # except for replacing ``with EnvironmentContext...`` with
    # ``pkg_env.run_env...``
    script = pkg_env.script_dir
    template_args = {
        'config': config  # Let templates use config for
                          # e.g. multiple databases
    }
    imports = set()

    environment = util.asbool(
        config.get_main_option("revision_environment")
    )

    if autogenerate:
        environment = True
        def retrieve_migrations(rev, context):
            if script.get_revision(rev) is not script.get_revision("head"):
                raise util.CommandError("Target database is not up to date.")
            autogen._produce_migration_diffs(context, template_args, imports)
            return []
    elif environment:
        def retrieve_migrations(rev, context):
            return []

    if environment:
        pkg_env.run_env(
            fn=retrieve_migrations,
            as_sql=sql,
            template_args=template_args,
        )
    script.generate_revision(util.rev_id(), message, **template_args)

def upgrade(extension_module_name, revision, sql=False, tag=None):
  pkg_env = ExtensionPackageEnv(extension_module_name)
  revision = revision or 'head'
  starting_rev = None
  if revision == 'head':
    revision = pkg_env.script_dir.get_current_head()
  if ':' in revision:
    if not sql:
      raise util.CommandError('Range revision not allowed')
    starting_rev, revision = revision.split(':', 2)

  print('Upgrading Extension Module {0}:'.format(extension_module_name))

  def upgrade(rev, context):
    return context.script._upgrade_revs(revision, rev)

  pkg_env.run_env(
      upgrade,
      starting_rev=starting_rev,
      destination_rev=revision,
      as_sql=sql,
      tag=tag,
      )

def downgrade(
    extension_module_name, revision,
    sql=False, tag=None, drop_versions_table=False):
  pkg_env = ExtensionPackageEnv(extension_module_name)
  starting_rev = None
  if ':' in revision:
    if not sql:
      raise util.CommandError('Range revision not allowed')
    starting_rev, revision = revision.split(':', 2)

  print('Downgrading Extension Module {0} to {1}:'.format(
    extension_module_name, revision))

  def downgrade(rev, context):
    return context.script._downgrade_revs(revision, rev)

  pkg_env.run_env(
      downgrade,
      starting_rev=starting_rev,
      destination_rev=revision,
      as_sql=sql,
      tag=tag,
      )

  if drop_versions_table:
    from ggrc.app import db
    db.session.execute('DROP TABLE {0}'.format(
        extension_version_table(extension_module_name)))

def history(extension_module_name):
  run_simple_command(extension_module_name, command.history)

def branches(extension_module_name):
  run_simple_command(extension_module_name, command.branches)

def current(extension_module_name, head_only=False):
  pkg_env = ExtensionPackageEnv(extension_module_name)
  config = pkg_env.config

  script = pkg_env.script_dir
  def display_version(rev, context):
      rev = script.get_revision(rev)

      if head_only:
          config.print_stdout("%s%s" % (
              rev.revision if rev else None,
              " (head)" if rev and rev.is_head else ""))

      else:
          config.print_stdout("Current revision for %s: %s",
                              util.obfuscate_url_pw(
                                  context.connection.engine.url),
                              rev)
      return []

  pkg_env.run_env(
      display_version,
      )

def stamp(extension_module_name, revision, sql=False, tag=None):
  pkg_env = ExtensionPackageEnv(extension_module_name)

  print('Stamping Extension Module {0} to {1}:'.format(
    extension_module_name, revision))

  def stamp(rev, context):
    if sql:
      current = False
    else:
      current = context._current_rev()
    dest = pkg_env.script.get_revision(revision)
    if dest is not None:
      dest = dest.revision
    context.script._update_current_rev(current, dest)
    return []

  pkg_env.run_env(
      stamp,
      destination_rev=revision,
      as_sql=sql,
      tag=tag,
      )

def all_extensions():
  extension_modules = ['ggrc']
  extension_modules.extend(getattr(settings, 'EXTENSIONS', []))
  return extension_modules

def upgradeall():
  for module_name in all_extensions():
    upgrade(module_name, 'head')

def downgradeall(drop_versions_table=False):
  for module_name in reversed(all_extensions()):
    print("Downgrading {}".format(module_name))
    downgrade(module_name, 'base', drop_versions_table=drop_versions_table)

def main(args):
  if len(args) < 3:
    print 'usage: migrate module_name <alembic command string>'
    return -1
  extension_module_name = args[1]
  cmd_line = CommandLine()
  options = cmd_line.parser.parse_args(args[2:])
  fn, positional, kwarg = options.cmd
  action = args[2]
  if action == 'upgrade':
    revision = args[3] if len(args) >= 4 else None
    upgrade(extension_module_name, revision)
  elif action == 'upgradeall':
    upgradeall()
  elif action == 'current':
    current(extension_module_name)
  elif action == 'downgrade':
    revision = args[3]
    downgrade(extension_module_name, revision)
  elif action == 'revision':
    revision_command(
        extension_module_name,
        **dict((k, getattr(options, k)) for k in kwarg))
  elif action == 'history':
    history(extension_module_name)
  return 0

if __name__ == '__main__':
  main(sys.argv)
