module PostsView exposing (..)

import Html.Attributes as Attributes
import Html exposing (Html)
import PostSummary

view : List PostSummary.Model -> Html PostSummary.Msg
view posts =
    let
        postViews =
            posts
                |> List.map PostSummary.view
    in
        Html.div
            [ Attributes.class "posts-view" ]
            postViews
