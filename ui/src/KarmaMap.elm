module KarmaMap exposing
    ( KarmaMap
    , addWeight
    , decode
    , empty
    , encode
    , maxWeight
    , score
    , weight
    )

import Comet.Types.Address exposing (Address)
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.Vote exposing (Vote)
import Dict exposing (Dict)
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)
import Set
import Tuple exposing (pair)


type alias KarmaMap =
    Dict ( Address, Tag ) Float


decode : Decoder KarmaMap
decode =
    let
        kvpairDecoder =
            Decode.map2 pair
                (Decode.field "key" keyDecoder)
                (Decode.field "value" Decode.float)

        keyDecoder =
            Decode.map2 pair
                (Decode.field "address" Decode.string)
                (Decode.field "tag" Decode.int)
    in
    Decode.list kvpairDecoder
        |> Decode.map
            Dict.fromList


encode : KarmaMap -> Value
encode karmaMap =
    let
        encodeKey ( address, tag ) =
            Encode.object
                [ ( "address", Encode.string address )
                , ( "tag", Encode.int tag )
                ]

        encodekvPair ( key, value ) =
            Encode.object
                [ ( "key", encodeKey key )
                , ( "value", Encode.float value )
                ]
    in
    Encode.list
        encodekvPair
        (karmaMap |> Dict.toList)


empty : KarmaMap
empty =
    Dict.empty


addWeight : Address -> InTermsOf -> Float -> KarmaMap -> KarmaMap
addWeight address inTermsOf fraction karmaMap =
    inTermsOf
        |> Set.foldl
            (\tag ->
                Dict.update
                    ( address, tag )
                    (\oldEntry ->
                        case oldEntry of
                            Just oldWeight ->
                                Just (oldWeight + fraction)

                            Nothing ->
                                Just fraction
                    )
            )
            karmaMap


maxWeight : Float
maxWeight =
    15


capWeight : Float -> Float
capWeight x =
    min maxWeight (max -maxWeight x)


weight : Address -> InTermsOf -> KarmaMap -> Float
weight user inTermsOf karmaMap =
    inTermsOf
        |> Set.toList
        |> List.map (pair user)
        |> List.filterMap (\p -> Dict.get p karmaMap)
        |> List.sum
        |> capWeight


score : List Vote -> InTermsOf -> KarmaMap -> Float
score votes inTermsOf karmaMap =
    votes
        |> List.map
            (\vote ->
                vote.fraction * weight vote.keyHash inTermsOf karmaMap
            )
        |> List.sum
