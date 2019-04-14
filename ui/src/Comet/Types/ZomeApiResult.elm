module Comet.Types.ZomeApiResult exposing (ZomeApiResult, decode)

import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type alias ZomeApiResult a =
    Result ZomeApiError a


decode : Decoder a -> Decoder (ZomeApiResult a)
decode okDecoder =
    Decode.oneOf
        [ Decode.field "Ok" okDecoder
            |> Decode.map Ok
        , Decode.field "Err" ZomeApiError.decode
            |> Decode.map Err
        ]
