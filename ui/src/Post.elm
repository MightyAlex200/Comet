module Post exposing (..)

import Json.Decode as Decode exposing (Decoder)

type alias Post =
    { title : String
    , content : String
    }

empty : Post
empty =
    Post "" ""

decoder : Decoder Post
decoder =
    Decode.map2 Post (Decode.field "title" Decode.string) (Decode.field "content" Decode.string)
