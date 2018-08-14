module Comment exposing (..)

import Json.Decode as Decode exposing (Decoder)

type alias CommentEntry =
    { content : String
    }

type Comment
    = Loaded CommentEntry
    | Unloaded
    | Error String

decoder : Decoder Comment
decoder =
    let
        entryDecoder =
            Decode.map CommentEntry
                (Decode.field "content" Decode.string)
    in
        Decode.map Loaded (entryDecoder)
