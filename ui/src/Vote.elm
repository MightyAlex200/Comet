module Vote exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)
import Tags exposing (Tag)

type alias Vote =
    { isPositive : Bool
    , fraction : Float
    , inTermsOf : Maybe (List Tag)
    }

decoder : Decoder Vote
decoder =
    Decode.map3 Vote
        (Decode.field "isPositive" Decode.bool)
        (Decode.field "fraction" Decode.float)
        (Decode.maybe (Decode.field "inTermsOf" (Decode.list Decode.int)))

encode : Vote -> Value
encode vote =
    let
        inTermsOf =
            vote.inTermsOf
                |> Maybe.map (Encode.list Encode.int)
                |> Maybe.map (Tuple.pair "inTermsOf")
                |> Maybe.map List.singleton
                |> Maybe.withDefault []
    in
        Encode.object
            ([ ("isPositive", Encode.bool vote.isPositive)
            , ("fraction", Encode.float vote.fraction)
            ] ++ inTermsOf)
