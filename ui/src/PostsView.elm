module PostsView exposing (..)

import Html.Attributes as Attributes
import Html exposing (Html)
import OrderContent
import PostSummary

view : List PostSummary.Model -> Html ( PostSummary.Model, PostSummary.Msg )
view posts =
    let
        postViews =
            posts -- TODO: Setting for how you want to sort things
                |> List.sortWith OrderContent.top
                |> List.map (\model ->
                    PostSummary.view model
                        |> Html.map (Tuple.pair model)
                    )
    in
        Html.div
            [ Attributes.class "posts-view" ]
            postViews
