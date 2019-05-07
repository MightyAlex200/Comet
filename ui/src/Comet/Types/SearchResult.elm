module Comet.Types.SearchResult exposing (InTermsOf, SearchResult, decode)

import Comet.Types.Address exposing (Address)
import Comet.Types.Tag exposing (Tag)
import Json.Decode as Decode exposing (Decoder)
import Set exposing (Set)


type alias InTermsOf =
    Set Tag


type alias SearchResult =
    { address : Address
    , inTermsOf : InTermsOf
    }


decode : Decoder SearchResult
decode =
    Decode.map2 SearchResult
        (Decode.field "address" Decode.string)
        (Decode.field "in_terms_of"
            (Decode.list Decode.int
                |> Decode.map Set.fromList
            )
        )
