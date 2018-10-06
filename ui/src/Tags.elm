module Tags exposing (..)

import Json.Encode as Encode exposing (Value)

type alias Tag =
    Int

type Search a
    = Exactly a
    | Not (List (Search a))
    | And (List (Search a))
    | Or (List (Search a))
    | Xor (List (Search a))

encode : (a -> Value) -> Search a -> Value
encode aEncode search =
    let
        searchType =
            case search of
                Exactly _ ->
                    "exactly"
                Not _ ->
                    "not"
                And _ ->
                    "and"
                Or _ ->
                    "or"
                Xor _ ->
                    "xor"
        encodeRecurse values =
            values
                |> Encode.list (encode aEncode)
        value =
            case search of
                Exactly a ->
                    aEncode a
                Not values ->
                    encodeRecurse values
                And values ->
                    encodeRecurse values
                Or values ->
                    encodeRecurse values
                Xor values ->
                    encodeRecurse values
    in
        Encode.object
            [ ( "type", Encode.string searchType )
            , ( "values", value )
            ]
