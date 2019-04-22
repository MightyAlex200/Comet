module Comet.Types.Vote exposing (Vote, decode, encode)

import Comet.Types.Address exposing (Address)
import Comet.Types.Tag exposing (Tag)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias Vote =
    { fraction : Float
    , inTermsOf : List Tag
    , targetHash : Address
    , keyHash : Address
    , timestamp : String
    }


decode : Decoder Vote
decode =
    Decode.map5 Vote
        (Decode.field "fraction" Decode.float)
        (Decode.field "in_terms_of" (Decode.list Decode.int))
        (Decode.field "target_hash" Decode.string)
        (Decode.field "key_hash" Decode.string)
        (Decode.field "timestamp" Decode.string)


encode : Vote -> Encode.Value
encode vote =
    Encode.object
        [ ( "fraction", Encode.float vote.fraction )
        , ( "in_terms_of", Encode.list Encode.int vote.inTermsOf )
        , ( "target_hash", Encode.string vote.targetHash )
        , ( "key_hash", Encode.string vote.keyHash )
        , ( "timestamp", Encode.string vote.timestamp )
        ]
