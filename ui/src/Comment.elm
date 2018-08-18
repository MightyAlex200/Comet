module Comment exposing (..)

import Json.Decode as Decode exposing (Decoder)

type alias Comment =
    { content : String
    }

decoder : Decoder Comment
decoder =
    Decode.map Comment
        (Decode.field "content" Decode.string)
