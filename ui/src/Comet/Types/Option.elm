module Comet.Types.Option exposing (Option, decode)

import Json.Decode as Decode exposing (Decoder)


type alias Option a =
    Maybe a


decode : Decoder a -> Decoder (Option a)
decode =
    Decode.nullable
