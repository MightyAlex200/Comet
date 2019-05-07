module SearchParse exposing (group, search, tag)

import Comet.Types.Search exposing (Search(..))
import Comet.Types.Tag exposing (Tag)
import Parser exposing (Parser)


tag : Parser Tag
tag =
    Parser.int


group : String -> (List Search -> Search) -> Parser Search
group separator searchType =
    Parser.sequence
        { start = "("
        , separator = separator
        , end = ")"
        , spaces = Parser.spaces
        , item = Parser.lazy (\_ -> search)
        , trailing = Parser.Forbidden
        }
        |> Parser.map searchType


search : Parser Search
search =
    Parser.oneOf
        [ tag |> Parser.map Exactly
        , Parser.backtrackable (group "and" And)
        , Parser.backtrackable (group "or" Or)
        , Parser.backtrackable (group "xor" Xor)
        , Parser.backtrackable (group "not" Not)
        ]
