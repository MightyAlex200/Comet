module SearchParse exposing (..)

import Parser exposing (Parser)
import Tags exposing (Tag, Search)

tag : Parser Tag
tag =
    Parser.int

group : String -> (List (Search Tag) -> Search Tag) -> Parser (Search Tag)
group separator searchType =
    (Parser.sequence
        { start = "("
        , separator = separator
        , end = ")"
        , spaces = Parser.spaces
        , item = Parser.lazy (\_ -> search)
        , trailing = Parser.Forbidden
        })
        |> Parser.map searchType

search : Parser (Search Tag)
search =
    Parser.oneOf
        [ tag |> Parser.map Tags.Exactly
        , group "and" Tags.And
        , group "or" Tags.Or
        , group "xor" Tags.Xor
        , group "not" Tags.Not
        ]
