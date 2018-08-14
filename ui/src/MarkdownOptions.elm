module MarkdownOptions exposing (..)

import Html exposing (Html)
import Markdown

safe : Markdown.Options
safe =
    { githubFlavored = Just { tables = True, breaks = True }
    , defaultHighlighting = Nothing
    , sanitize = True
    , smartypants = False
    }

safeRender : List (Html.Attribute msg) -> String -> Html msg
safeRender =
    Markdown.toHtmlWith safe
