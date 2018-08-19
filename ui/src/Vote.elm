module Vote exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)

type alias Vote =
    { isPositive : Bool
    , fraction : Float
    }

decoder : Decoder Vote
decoder =
    Decode.map2 Vote
        (Decode.field "isPositive" Decode.bool)
        (Decode.field "fraction" Decode.float)

encode : Vote -> Value
encode vote =
    Encode.object
    [ ("isPositive", Encode.bool vote.isPositive)
    , ("fraction", Encode.float vote.fraction)
    ]
