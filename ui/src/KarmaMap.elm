module KarmaMap exposing
    ( KarmaMap
    , empty
    , maxWeight
    , score
    , weight
    )

import Comet.Types.Address exposing (Address)
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.Tag exposing (Tag)
import Comet.Types.Vote exposing (Vote)
import Dict exposing (Dict)
import Set
import Tuple exposing (pair)


type alias KarmaMap =
    Dict ( Address, Tag ) Float


empty : KarmaMap
empty =
    Dict.empty


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
