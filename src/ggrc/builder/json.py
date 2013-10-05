# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

import bleach
import ggrc.builder
import ggrc.services
import iso8601
from datetime import datetime
from ggrc import db
from ggrc.login import get_current_user_id
from ggrc.models.reflection import AttributeInfo
from ggrc.utils import url_for, view_url_for
from sqlalchemy.ext.associationproxy import AssociationProxy
from sqlalchemy.orm.attributes import InstrumentedAttribute
from sqlalchemy.orm.properties import RelationshipProperty
from werkzeug.exceptions import BadRequest

"""JSON resource state representation handler for gGRC models."""

def get_json_builder(obj):
  """Instantiate or retrieve a JSON representation builder for the given
  object.
  """
  if type(obj) is type:
    cls = obj
  else:
    cls = obj.__class__
  # Lookup the builder instance in the builder module
  builder = getattr(ggrc.builder, cls.__name__, None)
  if not builder:
    # Create the builder and cache it in the builder module
    builder = Builder(cls)
    setattr(ggrc.builder, cls.__name__, builder)
  return builder

def publish_base_properties(obj):
    ret = {}
    self_url = url_for(obj)
    if self_url:
      ret['selfLink'] = self_url
    view_url = view_url_for(obj)
    if view_url:
      ret['viewLink'] = view_url
    return ret

def publish(obj, inclusions=()):
  """Translate ``obj`` into a valid JSON value. Objects with properties are
  translated into a ``dict`` object representing a JSON object while simple
  values are returned unchanged or specially formatted if needed.
  """
  publisher = get_json_builder(obj)
  if publisher and hasattr(publisher, '_publish_attrs') \
      and publisher._publish_attrs:
    ret = publish_base_properties(obj)
    ret.update(publisher.publish_contribution(obj, inclusions))
    return ret
  # Otherwise, just return the value itself by default
  return obj

def publish_stub(obj):
  publisher = get_json_builder(obj)
  if publisher:
    ret = {}
    self_url = url_for(obj)
    if self_url:
      ret['href'] = self_url
    ret['type'] = obj.__class__.__name__
    if hasattr(publisher, '_stub_attrs') and publisher._stub_attrs:
      ret.update(publisher.publish_stubs(obj))
    return ret
  # Otherwise, just return the value itself by default
  return obj


def update(obj, json_obj):
  """Translate the state represented by ``json_obj`` into update actions
  performed upon the model object ``obj``. After performing the update ``obj``
  and ``json_obj`` should be equivalent representations of the model state.
  """
  updater = get_json_builder(obj)
  if updater:
    updater.update(obj, json_obj)
  #FIXME what to do if no updater??
  #Nothing, perhaps log, assume omitted by design

def create(obj, json_obj):
  """Translate the state represented by ``json_obj`` into update actions
  performed upon the new model object ``obj``. After performing the update
  ``obj`` and ``json_obj`` should be equivalent representations of the model
  state.
  """
  creator = get_json_builder(obj)
  if creator:
    creator.create(obj, json_obj)

class UpdateAttrHandler(object):
  """Performs the translation of a JSON state representation into update
  actions performed on a model object instance.
  """
  @classmethod
  def do_update_attr(cls, obj, json_obj, attr):
    """Perform the update to ``obj`` required to make the attribute attr
    equivalent in ``obj`` and ``json_obj``.
    """
    if (hasattr(attr, '__call__')):
      # The attribute has been decorated with a callable, grab the name and
      # invoke the callable to get the value
      attr_name = attr.attr_name
      value = attr(cls, obj, json_obj)
    else:
      # Lookup the method to use to perform the update. Use reflection to
      # key off of the type of the attribute and invoke the method of the
      # same name.
      attr_name = attr
      class_attr = getattr(obj.__class__, attr_name)
      method = getattr(cls, class_attr.__class__.__name__)
      value = method(obj, json_obj, attr_name, class_attr)
    if isinstance(value, (set, list)):
      # SQLAlchemy instrumentation botches up if we replace entire collections
      # It works if we update them with changes
      new_set = set(value)
      old_set = set(getattr(obj, attr_name))
      coll_class_attr = getattr(obj.__class__, attr_name)
      coll_attr = getattr(obj, attr_name)
      # Join table objects require special handling so that we can be sure to
      # set the modified_by_id correctly
      if isinstance(coll_class_attr, AssociationProxy):
        current_user_id = get_current_user_id()
        proxied_attr = coll_class_attr.local_attr
        proxied_property = coll_class_attr.remote_attr
        proxied_set_map = dict([(getattr(i, proxied_property.key), i)\
            for i in getattr(obj, proxied_attr.key)])
        coll_attr = getattr(obj, proxied_attr.key)
        for item in new_set - old_set:
          new_item = coll_class_attr.creator(item)
          new_item.modified_by_id = current_user_id
          coll_attr.append(new_item)
        for item in old_set - new_set:
          coll_attr.remove(proxied_set_map[item])
      else:
        for item in new_set - old_set:
          coll_attr.append(item)
        for item in old_set - new_set:
          coll_attr.remove(item)
    else:
      setattr(obj, attr_name, value)

  @classmethod
  def InstrumentedAttribute(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for an ``InstrumentedAttribute``"""
    method = getattr(cls, class_attr.property.__class__.__name__)
    return method(obj, json_obj, attr_name, class_attr)

  @classmethod
  def ColumnProperty(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for a ``ColumnProperty``"""
    method = getattr(
        cls,
        class_attr.property.expression.type.__class__.__name__,
        cls.default_column_handler)
    return method(obj, json_obj, attr_name, class_attr)

  @classmethod
  def default_column_handler(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for a simple value column"""
    return json_obj.get(attr_name)

  @classmethod
  def DateTime(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for a ``Datetime`` column."""
    value = json_obj.get(attr_name)
    try:
      if value:
        d = iso8601.parse_date(value)
        d = d.replace(tzinfo=None)
      else:
        d = None
      return d
    except iso8601.ParseError as e:
      raise BadRequest(
          'Malformed DateTime {0} for parameter {1}. '
          'Error message was: {2}'.format(value, attr_name, e.message)
          )

  @classmethod
  def Date(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for a ``Date`` column."""
    value = json_obj.get(attr_name)
    try:
      return datetime.strptime(value, "%Y-%m-%d") if value else None
    except ValueError as e:
      raise BadRequest(
          'Malformed Date {0} for parameter {1}. '
          'Error message was: {2}'.format(value, attr_name, e.message)
          )

  @classmethod
  def query_for(cls, rel_class, json_obj, attr_name, uselist):
    """Resolve the model object instance referred to by the JSON value."""
    if uselist:
      # The value is a collection of links, resolve the collection of objects
      value = json_obj.get(attr_name)
      rel_ids = [o[u'id'] for o in value] if value else []
      if rel_ids:
        return db.session.query(rel_class).filter(
            rel_class.id.in_(rel_ids)).all()
      else:
        return []
    else:
      rel_obj = json_obj.get(attr_name)
      if rel_obj:
        try:
          # FIXME: Should this be .one() instead of .first() ?
          return db.session.query(rel_class).filter(
            rel_class.id == rel_obj[u'id']).first()
        except(TypeError):
          raise TypeError(''.join(['Failed to convert attribute ', attr_name]))
      return None

  @classmethod
  def RelationshipProperty(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for a ``RelationshipProperty``."""
    rel_class = class_attr.property.mapper.class_
    return cls.query_for(
        rel_class, json_obj, attr_name, class_attr.property.uselist)

  @classmethod
  def AssociationProxy(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for an ``AssociationProxy``."""
    rel_class = class_attr.remote_attr.property.mapper.class_
    return cls.query_for(rel_class, json_obj, attr_name, True)

  @classmethod
  def property(cls, obj, json_obj, attr_name, class_attr):
    """Translate the JSON value for an object method decorated as a
    ``property``.
    """
    #FIXME need a way to decide this. Require link? Use URNs?
    #  reflective approaches won't work as this is used for polymorphic
    #  properties
    # rel_class = None
    # return cls.query_for(rel_class, json_obj, attr_name, True)
    attr_value = json_obj.get(attr_name, None)
    if attr_value:
      import ggrc.models
      rel_class_name = json_obj[attr_name]['type']
      rel_class = ggrc.models.get_model(rel_class_name)
      return cls.query_for(rel_class, json_obj, attr_name, False)
    return None

  @classmethod
  def simple_property(cls, obj, json_obj, attr_name, class_attr):
    return json_obj.get(attr_name)

class Builder(AttributeInfo):
  """JSON Dictionary builder for ggrc.models.* objects and their mixins.

  `_make_*` methods are designed to preprocess all possible class-based
    decisions, to make the generation from instances as fast as possible.

  There are multiple `_make_*_links_publisher` methods to minimize object
    access in cases where we can build the link without touching the object
    itself (which would cause SQLAlchemy to issue a query).
  """

  def _make_included_collection_publisher(self, attr_name, class_attr):
    return lambda join_objects:\
        []

  def _make_link_object_generator(self):
    return lambda id, type:\
        {'id': id, 'type': type, 'href': url_for(type, id=id)}

  def _make_polymorphic_links_publisher(self, id_attr, type_attr):
    """For polymorphic joins where we know the `*_id` and `*_type` columns
    """
    link_object_generator = self._make_link_object_generator()
    return lambda join_objects:\
        [link_object_generator(getattr(o, id_attr), getattr(o, type_attr))
            for o in join_objects]

  def _make_typed_links_publisher(self, id_attr, type_value):
    """For joins where we know the `*_id` column and have a constant `type`
    value
    """
    link_object_generator = self._make_link_object_generator()
    return lambda join_objects:\
        [link_object_generator(getattr(o, id_attr), type_value)
            for o in join_objects]

  def _make_naive_join_links_publisher(self, attr_name):
    """For joins with a polymorphic target type, where we have to look at the
    object itself to know its real `type`.
    """
    link_object_generator = self._make_link_object_generator()
    def publish_links(join_objects):
      objects_generator = (getattr(jo, attr_name) for jo in join_objects)
      return [link_object_generator(o.id, o.__class__.__name__)
          for o in objects_generator if o is not None]
    return publish_links

  def _make_naive_attr_links_publisher(self, attr_name):
    """For joins with a polymorphic target type, where we have to look at the
    object itself to know its real `type`.
    """
    link_object_generator = self._make_link_object_generator()
    def publish_links(base_object):
      objects_generator = getattr(base_object, attr_name)
      return [link_object_generator(o.id, o.__class__.__name__)
          for o in objects_generator if o is not None]
    return publish_links

  def _make_association_proxy_publisher(self, attr_name, class_attr):
    """For `association_proxy` links, e.g., linking across a table/object to
    get the target `id` and `type`
    """
    included_collection_publisher =\
      self._make_included_collection_publisher(attr_name, class_attr)

    join_objects_key = class_attr.local_attr.key
    if isinstance(class_attr.remote_attr, property):
      # Here, we don't have to inspect the linked object, since the target
      # type and id are available on the join object
      id_attr = class_attr.value_attr + '_id'
      type_attr = class_attr.value_attr + '_type'
      links_publisher =\
          self._make_polymorphic_links_publisher(id_attr, type_attr)
    else:
      target_mapper = class_attr.remote_attr.property.mapper
      if len(list(target_mapper.self_and_descendants)) > 1:
        # Here we have to use the naive link publisher, since we don't know
        # what the actual target type is, due to inheritance
        target_attr = class_attr.remote_attr.property.key
        links_publisher =\
            self._make_naive_join_links_publisher(target_attr)
      else:
        # Here, we don't have to inspect, since we have a constant target
        # type and a local column for the id
        id_attr = list(class_attr.remote_attr.property.local_columns)[0].key
        type_value = class_attr.remote_attr.property.mapper.class_.__name__
        links_publisher =\
            self._make_typed_links_publisher(id_attr, type_value)

    def publish_association_proxy(obj, inclusions, include):
      # If `include` then we have to "enter" the object anyway
      if include:
        return included_collection_publisher(obj, inclusions, include)
      else:
        return links_publisher(getattr(obj, join_objects_key))

    return publish_association_proxy

  def _make_relationship_list_publisher(self, attr_name, class_attr):
    included_collection_publisher =\
        self._make_included_collection_publisher(attr_name, class_attr)

    # `relationship` is only `uselist` if it is a remote key, so we have to
    # "enter" the target object anyway
    links_publisher = self._make_naive_attr_links_publisher(attr_name)
    def publish_link_collection(obj, inclusions, include):
      if include:
        return included_collection_publisher(obj, inclusions, include)
      else:
        return links_publisher(obj)
    return publish_link_collection

  def _make_polymorphic_link_publisher(self, id_attr, type_attr):
    """For polymorphic joins where we know the `*_id` and `*_type` columns
    """
    link_object_generator = self._make_link_object_generator()
    def publish_link(base_object):
      id = getattr(base_object, id_attr)
      if id is None:
        return None
      return link_object_generator(id, getattr(base_object, type_attr))
    return publish_link

  def _make_typed_link_publisher(self, id_attr, type_value):
    """For joins where we know the `*_id` column and have a constant `type`
    value
    """
    link_object_generator = self._make_link_object_generator()
    def publish_link(base_object):
      id = getattr(base_object, id_attr)
      if id is None:
        return None
      return link_object_generator(id, type_value)
    return publish_link

  def _make_naive_link_publisher(self, attr_name):
    """For joins with a polymorphic target type, where we have to look at the
    object itself to know its real `type`.
    """
    link_object_generator = self._make_link_object_generator()
    def publish_link(base_object):
      obj = getattr(base_object, attr_name)
      if obj is None:
        return None
      return link_object_generator(obj.id, obj.__class__.__name__)
    return publish_link

  def _make_relationship_publisher(self, attr_name, class_attr):
    uselist = class_attr.property.uselist
    if uselist:
      return self._make_relationship_list_publisher(attr_name, class_attr)

    # Is this necessary?
    if class_attr.property.backref:
      link_publisher = self._make_naive_link_publisher(attr_name)
    elif class_attr.property.mapper.class_.__mapper__.polymorphic_on is not None:
      link_publisher = self._make_naive_link_publisher(attr_name)
    else:
      type_value = class_attr.property.mapper.class_.__name__
      id_attr = list(class_attr.property.local_columns)[0].key
      link_publisher = self._make_typed_link_publisher(id_attr, type_value)

    def publish_related_object(obj, inclusions, include):
      if include:
        # Requested to include the full object
        return included_object_publisher(obj, inclusions, include)
      else:
        return link_publisher(obj)
    return publish_related_object

  def _make_attr_publisher(self, target_class, attr_name):
    class_attr = getattr(target_class, attr_name)
    if isinstance(class_attr, AssociationProxy):
      return self._make_association_proxy_publisher(attr_name, class_attr)
    elif isinstance(class_attr, InstrumentedAttribute) and \
         isinstance(class_attr.property, RelationshipProperty):
      return self._make_relationship_publisher(attr_name, class_attr)
    elif class_attr.__class__.__name__ == 'property':
      # This only happens when it's a polymorphic link
      # FIXME: Move into _make_relationship_publisher
      id_attr = attr_name + '_id'
      type_attr = attr_name + '_type'
      link_publisher =\
          self._make_polymorphic_link_publisher(id_attr, type_attr)
      return lambda obj, inclusions, include:\
          link_publisher(obj)
      #return self._make_link_publisher(attr_name, class_attr)

    def publish_attr(obj, inclusions, include):
      # Ignore `include` and `inclusions` on simple attrs
      return getattr(obj, attr_name)
    return publish_attr

  def _make_attr_publishers(self):
    attr_publishers = []
    for attr in self._publish_attrs:
      if hasattr(attr, '__call__'):  # ? callable(attr):
        attr_name = attr.attr_name
      else:
        attr_name = attr

      attr_publishers.append((
          attr_name,
          self._make_attr_publisher(self._target_class, attr_name)))

    return attr_publishers

  def publish_attrs(self, obj, json_obj, inclusions):
    """Translate the state represented by ``obj`` into the JSON dictionary
    ``json_obj``.
    
    The ``inclusions`` parameter can specify a tree of property paths to be
    inlined into the representation. Leaf attributes will be inlined completely
    if they are links to other objects. The inclusions data structure is a
    list where the first segment of a path is a string and the next segment
    is a list of segment paths. Here are some examples:

    ..

      ('directives')
      [('directives'),('cycles')]
      [('directives', ('audit_frequency','organization')),('cycles')]
    """
    if not hasattr(self, '_attr_publishers'):
      self._attr_publishers = self._make_attr_publishers()

    for (attr_name, attr_publisher) in self._attr_publishers:
      local_inclusion = ()
      for inclusion in inclusions:
        if inclusion[0] == attr_name:
          local_inclusion = inclusion
          break
      json_obj[attr_name] = attr_publisher(
          obj, local_inclusion[1:], len(local_inclusion) > 0)

  @classmethod
  def do_update_attrs(cls, obj, json_obj, attrs):
    """Translate every attribute in ``attrs`` from the JSON dictionary value
    to a value or model object instance for references set for the attribute
    in ``obj``.
    """
    for attr_name in attrs:
      UpdateAttrHandler.do_update_attr(obj, json_obj, attr_name)

  def update_attrs(self, obj, json_obj):
    """Translate the state representation given by ``json_obj`` into the
    model object ``obj``.
    """
    self.do_update_attrs(obj, json_obj, self._update_attrs)

  def create_attrs(self, obj, json_obj):
    """Translate the state representation given by ``json_obj`` into the new
    model object ``obj``.
    """
    self.do_update_attrs(obj, json_obj, self._create_attrs)

  def publish_contribution(self, obj, inclusions):
    """Translate the state represented by ``obj`` into a JSON dictionary"""
    json_obj = {}
    self.publish_attrs(obj, json_obj, inclusions)
    return json_obj

  #def publish_stubs(self, obj):
  #  """Translate the state represented by ``obj`` into a JSON dictionary
  #  containing an abbreviated representation.
  #  """
  #  json_obj = {}
  #  self._publish_attrs_for(obj, self._stub_attrs, json_obj)
  #  return json_obj

  def update(self, obj, json_obj):
    """Update the state represented by ``obj`` to be equivalent to the state
    represented by the JSON dictionary ``json_obj``.
    """
    self.update_attrs(obj, json_obj)

  def create(self, obj, json_obj):
    """Update the state of the new model object ``obj`` to be equivalent to the
    state represented by the JSON dictionary ``json_obj``.
    """
    self.create_attrs(obj, json_obj)
