module Comet.Types.ZomeApiError exposing (ZomeApiError(..), decode, describe)

import Json.Decode as Decode exposing (Decoder)


type ZomeApiError
    = Internal String
    | FunctionNotImplemented
    | HashNotFound
    | ValidationFailed String
    | Timeout


exactString : String -> a -> Decoder a
exactString string eventually =
    Decode.string
        |> Decode.andThen
            (\str ->
                if str == string then
                    Decode.succeed eventually

                else
                    Decode.fail ("Did not find " ++ string)
            )


describe : ZomeApiError -> String
describe apiError =
    case apiError of
        Internal error ->
            "Internal error: " ++ error

        FunctionNotImplemented ->
            "Function not implemented"

        HashNotFound ->
            "Hash not found"

        ValidationFailed message ->
            "Validation failed with message \"" ++ message ++ "\""

        Timeout ->
            "Function call timed out"


decode : Decoder ZomeApiError
decode =
    Decode.oneOf
        [ Decode.field "Internal" Decode.string
            |> Decode.map Internal
        , exactString "FunctionNotImplemented" FunctionNotImplemented
        , exactString "HashNotFound" HashNotFound
        , Decode.field "ValidationFailed" Decode.string
            |> Decode.map ValidationFailed
        , exactString "Timeout" Timeout
        ]
