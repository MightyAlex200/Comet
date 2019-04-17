module PostModel exposing
    ( PostModel
    , PostMsg(..)
    , handleFunctionReturn
    , init
    , update
    , view
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
import Markdown
import Settings exposing (Settings)


type alias PostModel =
    { address : Address
    , post : Load ZomeApiError Post
    , comments : CommentTreeModel
    , commentCompose : CommentCompose
    , readId : Id
    }


type PostMsg
    = TreeModelMsg CommentTreeMsg
    | ComposeMsg CommentComposeMsg


init : Id -> Address -> ( Id, PostModel, Cmd msg )
init oldId address =
    let
        newReadId =
            getNewId oldId

        ( newId, ctm, ctmCmd ) =
            initCommentTreeModel newReadId address

        postModel =
            { address = address
            , post = Unloaded
            , comments = ctm
            , commentCompose = CommentCompose.init address
            , readId = newReadId
            }
    in
    ( newId
    , postModel
    , Cmd.batch
        [ Comet.Posts.readPost newReadId address
        , ctmCmd
        ]
    )


update :
    Id
    -> PostMsg
    -> PostModel
    -> ( Id, PostModel, Cmd PostMsg )
update oldId msg postModel =
    case msg of
        TreeModelMsg treeMsg ->
            let
                ( newId, treeModel, cmd ) =
                    updateCommentTreeModel oldId treeMsg postModel.comments
            in
            ( newId
            , { postModel | comments = treeModel }
            , Cmd.map TreeModelMsg cmd
            )

        ComposeMsg composeMsg ->
            let
                ( newId, composeModel, cmd ) =
                    CommentCompose.update
                        oldId
                        composeMsg
                        postModel.commentCompose
            in
            ( newId
            , { postModel | commentCompose = composeModel }
            , Cmd.map ComposeMsg cmd
            )


handleFunctionReturn :
    Id
    -> Comet.Port.FunctionReturn
    -> PostModel
    -> ( Id, PostModel, Cmd msg )
handleFunctionReturn oldId ret postModel =
    if ret.id == postModel.readId then
        let
            decoder =
                ZomeApiResult.decode Post.decode

            decodeResult =
                Decode.decodeValue decoder ret.return

            updatePost post =
                ( oldId
                , { postModel
                    | post = post
                  }
                , Cmd.none
                )
        in
        case decodeResult of
            Ok apiResult ->
                updatePost (Load.fromResult apiResult)

            Err _ ->
                updatePost (Failed (ZomeApiError.Internal "Invalid return"))

    else
        let
            ( newId1, treeModel, treeCmd ) =
                handleCommentTreeFunctionReturn
                    oldId
                    ret
                    postModel.comments

            composeReturnResult =
                CommentCompose.handleFunctionReturn
                    newId1
                    ret
                    postModel.commentCompose
        in
        if composeReturnResult.refresh then
            let
                ( treeModelId, newTreeModel, newTreeCmd ) =
                    initCommentTreeModel
                        composeReturnResult.newId
                        postModel.address
            in
            ( treeModelId
            , { postModel
                | comments = newTreeModel
                , commentCompose = composeReturnResult.commentCompose
              }
            , Cmd.batch
                [ newTreeCmd
                , composeReturnResult.cmd
                ]
            )

        else
            ( composeReturnResult.newId
            , { postModel
                | comments = treeModel
                , commentCompose = composeReturnResult.commentCompose
              }
            , Cmd.batch [ treeCmd, composeReturnResult.cmd ]
            )


view : Settings -> PostModel -> Html PostMsg
view settings postModel =
    let
        postHtml =
            case postModel.post of
                Unloaded ->
                    Html.text "Loading post"

                Failed x ->
                    Html.text
                        ("Failed loading post: " ++ ZomeApiError.describe x)

                Loaded post ->
                    viewPost settings post
    in
    Html.div
        []
        [ postHtml
        , Html.br [] []
        , CommentCompose.view settings postModel.commentCompose
            |> Html.map ComposeMsg
        , viewCommentTree settings postModel.comments
            |> Html.map TreeModelMsg
        ]


viewPost : Settings -> Post -> Html msg
viewPost settings post =
    Html.div []
        [ Html.h1 [] [ Html.text post.title ]
        , Markdown.toHtmlWith
            (Settings.markdownOptions settings.markdownSettings)
            []
            post.content
        ]
