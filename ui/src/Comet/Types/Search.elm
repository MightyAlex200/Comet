module Comet.Types.Search exposing (Search(..), decode, encode)

import Comet.Types.Tag exposing (Tag)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode


type Search
    = And (List Search)
    | Or (List Search)
    | Xor (List Search)
    | Not (List Search)
    | Exactly Tag


encode : Search -> Encode.Value
encode search =
    let
        searchesEncode =
            Encode.list encode

        withTagAndContent tag content f =
            Encode.object
                [ ( "type", Encode.string tag )
                , ( "values", f content )
                ]
    in
    case search of
        And searches ->
            withTagAndContent "and" searches searchesEncode

        Or searches ->
            withTagAndContent "or" searches searchesEncode

        Xor searches ->
            withTagAndContent "xor" searches searchesEncode

        Not searches ->
            withTagAndContent "not" searches searchesEncode

        Exactly tag ->
            withTagAndContent "exactly" tag Encode.int


decode : Decoder Search
decode =
    Decode.oneOf
        [ Decode.field "and" (Decode.list (Decode.lazy (\_ -> decode)))
            |> Decode.map And
        , Decode.field "or" (Decode.list (Decode.lazy (\_ -> decode)))
            |> Decode.map Or
        , Decode.field "xor" (Decode.list (Decode.lazy (\_ -> decode)))
            |> Decode.map Xor
        , Decode.field "not" (Decode.list (Decode.lazy (\_ -> decode)))
            |> Decode.map Not
        , Decode.field "exactly" Decode.int
            |> Decode.map Exactly
        ]
