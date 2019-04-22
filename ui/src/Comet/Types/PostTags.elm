module Comet.Types.PostTags exposing (PostTags, decode)

import Comet.Types.Tag exposing (Tag)
import Json.Decode as Decode exposing (Decoder)
import Set exposing (Set)


type alias PostTags =
    { originalTags : Set Tag
    , crosspostTags : Set Tag
    }


decode : Decoder PostTags
decode =
    let
        tagSetDecoder =
            Decode.list Decode.int
                |> Decode.map Set.fromList
    in
    Decode.map2 PostTags
        (Decode.field "original_tags" tagSetDecoder)
        (Decode.field "crosspost_tags" tagSetDecoder)
