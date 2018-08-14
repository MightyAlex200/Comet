module Post exposing (..)

import Json.Decode as Decode exposing (Decoder)

type alias PostEntry =
    { title : String
    , content : String
    }

type Post
    = Loaded PostEntry
    | Unloaded
    | Error String

decoder : Decoder Post
decoder =
    let
        entryDecoder =
            Decode.map2 PostEntry
                (Decode.field "title" Decode.string)
                (Decode.field "content" Decode.string)
    in
        Decode.map Loaded (entryDecoder)
