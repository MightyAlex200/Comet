module Comet.Types.GetLinksResult exposing (GetLinksResult)

import Comet.Types.Address exposing (Address)


type alias GetLinksResult =
    { addresses : List Address
    }
