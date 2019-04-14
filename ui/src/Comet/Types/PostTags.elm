module Comet.Types.PostTags exposing (PostTags)

import Comet.Types.Tag exposing (Tag)


type alias PostTags =
    { originalTags : List Tag
    , crosspostTags : List Tag
    }
