module Comet.Types.Entry exposing (Entry(..), decode)

import Json.Decode as Decode exposing (Decoder)


type alias AppEntryType =
    String


type alias AppEntryValue =
    String


type Entry
    = App AppEntryType AppEntryValue



-- | Dna Dna
-- | AgentId AgentId
-- | Deletion DeletionEntry
-- | LinkAdd LinkData
-- | LinkRemove LinkData
-- | LinkList LinkList
-- | ChainHeader ChainHeader
-- | ChainMigrate ChainMigrate
-- | CapToken CapToken
-- | CapTokenGrant CapTokenGrant


decode : Decoder Entry
decode =
    Decode.oneOf
        [ Decode.map2 App
            (Decode.field "App" (Decode.index 0 Decode.string))
            (Decode.field "App" (Decode.index 1 Decode.string))
        ]
