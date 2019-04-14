module Comet.Types.Post exposing (Post, decode, encode)

import Comet.Types.Address exposing (Address)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias Post =
    { title : String
    , content : String
    , keyHash : Address
    , timestamp : String
    }


encode : Post -> Encode.Value
encode post =
    Encode.object
        [ ( "title", Encode.string post.title )
        , ( "content", Encode.string post.content )
        , ( "key_hash", Encode.string post.keyHash )
        , ( "timestamp", Encode.string post.timestamp )
        ]


decode : Decoder Post
decode =
    Decode.map4 Post
        (Decode.field "title" Decode.string)
        (Decode.field "content" Decode.string)
        (Decode.field "key_hash" Decode.string)
        (Decode.field "timestamp" Decode.string)
