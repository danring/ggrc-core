..
  Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
  Created By: silas@reciprocitylabs.com
  Maintained By: silas@reciprocitylabs.com


Setting up an example program
=========

This documents how to call the function to set up an example program with random governance and business objects and random mappings between them

Overview
-------------------

The file ``src/ggrc/seed/random_prog.py`` calls the function ``seed_random`` which makes a number of governance objects (now, 9 of each) and business objects (now, 15 of each).  It then randomly maps each governance object to 5 other governance objects and to 7 business objects.  Each business object is also mapped in 5 business objects.

Run by making a GET request to the path ``/admin/seedrandom`` while an administrator.

To use a prefix of your choice, use the path ``/admin/seedrandom/<prefix>``, where ``prefix`` is the prefix you would like to prepend to the names, titles, and slugs of the example objects.

To set the numbert of objects, use the path ``/admin/seedrandom/custom/<prefix>/<num_gov>/<num_bis>/<num_map>`` where ``num_gov`` is the number of governance objects, ``num_bis`` the number of business objects, and ``num_map`` the number of mappings from each object to others. Defaults are 10/15/10. (For governance objects, there will be that many for governance-to-governance *and* that many for governance-to-business.)

Sections are treated differently from other governance objects in that ``num_gov`` will mean how many sections are placed under *each* directive object.

Gotchas
-------------------

- Sections, a kind of governance object, require special handling because they must be instantiated in a way that attaches them to a parent directive.  For this reason, the script handles Sections as a special case, putting it in a separate list and treating it differently in an ``elif`` branch of ``set_up_object``

- The programs were hidden from the LHN and widgets, which was traced to the ``?kind=Directive`` query string in the ``findAll`` attribute in ``src/ggrc/assets/javascripts/models/simple_models.js``. It was therefore removed.


Implementation and design decisions
-------------------
Originally, it was intended that the code would attempt add/commit each new object and roll back if it failed.  This would make addition of the example program idempotent and handle collisions with pre-existing objects.  However, the frequent commits would be slow on AppEngine, so the objects are all added and then committed only afterward.

In order to avoid the warning "root:No request context - no cache created", and ensure that the objects appear on the site, the script is executed by a call a view function.  Therefore, the code is wrapped by a request (see ``src/ggrc/seed/request_wrapper.py``) to the path ``/admin/seedrandom``.  It must log in before requesting that path.

By default, all object slugs, names, and titles are prefixed with "EXAMPLE"; to give them a different prefix, make the request to ``/admin/seedrandom/withprefix/<prefix>`` instead.

A utility function, ``get_join_object``, implemented in ``src/ggrc/seed/mappings.py`` provides a interface for (creating the join object that must be added to the db when) mapping arbitrary objects.
