module KarmaMap exposing (KarmaMap)

import Tags exposing (Tag)

type alias KarmaMap =
    Maybe (List Tag) -> String -> Float
