module PostModel exposing
    ( PostPageModel
    , PostPageMsg(..)
    , initPostPageModel
    , updatePostPageModel
    , viewPost
    , viewPostPage
    )

import Comet.Port exposing (Id, getNewId)
import Comet.Posts
import Comet.Types.Address exposing (Address)
import Comet.Types.Load as Load exposing (Load(..))
import Comet.Types.Post as Post exposing (Post)
import Comet.Types.ZomeApiError as ZomeApiError exposing (ZomeApiError)
import Comet.Types.ZomeApiResult as ZomeApiResult
import CommentCompose
    exposing
        ( CommentCompose
        , CommentComposeMsg
        , initCommentCompose
        , updateCommentCompose
        , viewCommentCompose
        )
import CommentModel
    exposing
        ( CommentTreeModel
        , CommentTreeMsg
        , handleCommentTreeFunctionReturn
        , initCommentTreeModel
        , updateCommentTreeModel
        , viewCommentTree
        )
import Html exposing (Html)
import Json.Decode as Decode


type alias PostPageModel =
    { address : Address
    , post : Load ZomeApiError Post
    , comments : CommentTreeModel
    , commentCompose : CommentCompose
    , readId : Id
    }


type PostPageMsg
    = FunctionReturned Comet.Port.FunctionReturn
    | TreeModelMsg CommentTreeMsg
    | ComposeMsg CommentComposeMsg


initPostPageModel : Id -> Address -> ( Id, PostPageModel, Cmd msg )
initPostPageModel oldId address =
    let
        newReadId =
            getNewId oldId

        ( newId, ctm, ctmCmds ) =
            initCommentTreeModel newReadId address

        postPageModel =
            { address = address
            , post = Unloaded
            , comments = ctm
            , commentCompose = initCommentCompose address
            , readId = newReadId
            }
    in
    ( newId
    , postPageModel
    , Cmd.batch
        [ Comet.Posts.readPost newReadId address
        , ctmCmds
        ]
    )


updatePostPageModel :
    Id
    -> PostPageMsg
    -> PostPageModel
    -> ( Id, PostPageModel, Cmd PostPageMsg )
updatePostPageModel oldId msg pageModel =
    case msg of
        FunctionReturned ret ->
            handleFunctionReturn oldId ret pageModel

        TreeModelMsg treeMsg ->
            let
                ( newId, treeModel, cmd ) =
                    updateCommentTreeModel oldId treeMsg pageModel.comments
            in
            ( newId
            , { pageModel | comments = treeModel }
            , Cmd.map TreeModelMsg cmd
            )

        ComposeMsg composeMsg ->
            let
                ( newId, composeModel, cmd ) =
                    updateCommentCompose
                        oldId
                        composeMsg
                        pageModel.commentCompose
            in
            ( newId
            , { pageModel | commentCompose = composeModel }
            , Cmd.map ComposeMsg cmd
            )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> PostPageModel
    -> ( Id, PostPageModel, Cmd msg )
handleFunctionReturn oldId ret pageModel =
    if ret.id == pageModel.readId then
        let
            decoder =
                ZomeApiResult.decode Post.decode

            decodeResult =
                Decode.decodeValue decoder ret.return

            updatePost post =
                ( oldId
                , { pageModel
                    | post = post
                  }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok apiResult ->
                updatePost (Load.fromResult apiResult)

            Err decodeError ->
                updatePost (Failed (ZomeApiError.Internal "Invalid return"))

    else
        let
            ( newId1, treeModel, treeCmd ) =
                handleCommentTreeFunctionReturn
                    oldId
                    ret
                    pageModel.comments

            ( newId2, composeModel, composeCmd ) =
                CommentCompose.handleFunctionReturn
                    newId1
                    ret
                    pageModel.commentCompose
        in
        ( newId2
        , { pageModel
            | comments = treeModel
            , commentCompose = composeModel
          }
        , Cmd.batch [ treeCmd, composeCmd ]
        )


viewPostPage : PostPageModel -> Html PostPageMsg
viewPostPage postPageModel =
    let
        postHtml =
            case postPageModel.post of
                Unloaded ->
                    Html.text "Loading post"

                Failed x ->
                    Html.text
                        ("Failed loading post: " ++ ZomeApiError.describe x)

                Loaded pageModel ->
                    viewPost pageModel
    in
    Html.div
        []
        [ postHtml
        , Html.br [] []
        , viewCommentCompose postPageModel.commentCompose
            |> Html.map ComposeMsg
        , viewCommentTree postPageModel.comments
            |> Html.map TreeModelMsg
        ]


viewPost : Post -> Html msg
viewPost post =
    Html.div []
        [ Html.h1 [] [ Html.text post.title ]
        , Html.p [] [ Html.text post.content ]
        ]
