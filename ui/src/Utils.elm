module Utils exposing (unorderedList)

import Html exposing (Html)


unorderedList : List (Html msg) -> Html msg
unorderedList list =
    list
        |> List.map List.singleton
        |> List.map (Html.li [])
        |> Html.ul []
