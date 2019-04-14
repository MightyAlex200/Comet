module Comet.Types.Comment exposing (Comment, decode, encode)

import Comet.Types.Address exposing (Address)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias Comment =
    { content : String
    , keyHash : Address
    , timestamp : String
    }


decode : Decoder Comment
decode =
    Decode.map3 Comment
        (Decode.field "content" Decode.string)
        (Decode.field "key_hash" Decode.string)
        (Decode.field "timestamp" Decode.string)


encode : Comment -> Encode.Value
encode comment =
    Encode.object
        [ ( "content", Encode.string comment.content )
        , ( "key_hash", Encode.string comment.keyHash )
        , ( "timestamp", Encode.string comment.timestamp )
        ]
