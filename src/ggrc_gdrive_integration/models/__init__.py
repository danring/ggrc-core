
import ggrc.models.all_models #import all_models,  __all__
from .object_folder import ObjectFolder
from .object_file import ObjectFile
from .object_event import ObjectEvent

ggrc.models.all_models.ObjectFolder = ObjectFolder
ggrc.models.all_models.ObjectFile = ObjectFile
ggrc.models.all_models.ObjectEvent = ObjectEvent
ggrc.models.all_models.all_models += [ObjectFolder, ObjectFile, ObjectEvent]
ggrc.models.all_models.__all__ += [ObjectFolder.__name__, ObjectFile.__name__, ObjectEvent.__name__]
