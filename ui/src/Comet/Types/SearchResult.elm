module Comet.Types.SearchResult exposing (SearchResult)

import Comet.Types.Address exposing (Address)
import Comet.Types.Tag exposing (Tag)
import Set exposing (Set)


type alias InTermsOf =
    Set Tag


type alias SearchResult =
    { address : Address
    , inTermsOf : InTermsOf
    }
