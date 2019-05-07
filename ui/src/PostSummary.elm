module PostSummary exposing (PostSummary, handleFunctionReturn, init, view)

import Comet.Port exposing (Id, getNewId)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.Post as Post exposing (Post)
import Comet.Types.SearchResult exposing (InTermsOf)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import Html exposing (Html)
import Html.Attributes
import Json.Decode as Decode
import Set


type alias PostSummary =
    { address : Address
    , inTermsOf : InTermsOf
    , post : Load ZomeApiError Post
    , readId : Id
    }


init : Id -> Address -> InTermsOf -> ( Id, PostSummary, Cmd msg )
init oldId address inTermsOf =
    let
        readId =
            getNewId oldId
    in
    ( readId
    , { address = address
      , inTermsOf = inTermsOf
      , post = Unloaded
      , readId = readId
      }
    , Comet.Posts.readPost readId address
    )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> PostSummary
    -> ( Id, PostSummary, Cmd msg )
handleFunctionReturn oldId ret postSummary =
    if ret.id == postSummary.readId then
        let
            decoder =
                ZomeApiResult.decode Post.decode

            decodeResult =
                Decode.decodeValue decoder ret.return
        in
        case decodeResult of
            Ok apiResult ->
                ( oldId
                , { postSummary | post = Load.fromResult apiResult }
                , Cmd.none
                )

            Err _ ->
                ( oldId
                , { postSummary
                    | post = Failed (ZomeApiError.Internal "Invalid return")
                  }
                , Cmd.none
                )

    else
        ( oldId, postSummary, Cmd.none )


view : PostSummary -> Html msg
view postSummary =
    case postSummary.post of
        Loaded post ->
            let
                tags =
                    postSummary.inTermsOf
                        |> Set.map String.fromInt
                        |> Set.toList
                        |> String.join ","
            in
            Html.h1
                []
                [ Html.a
                    [ Html.Attributes.href
                        ("/post/" ++ postSummary.address ++ "/" ++ tags)
                    ]
                    [ Html.text post.title ]
                ]

        Failed _ ->
            Html.text "Failed to load post"

        Unloaded ->
            Html.text "Loading post..."
