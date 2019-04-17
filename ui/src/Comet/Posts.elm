module Comet.Posts exposing
    ( createPost
    , crosspost
    , deletePost
    , postTags
    , readPost
    , search
    , updatePost
    , userPosts
    )

import Comet.Port exposing (FunctionInformation)
import Comet.Types.Address exposing (Address)
import Comet.Types.Post exposing (Post)
import Comet.Types.PostContent exposing (PostContent)
import Comet.Types.Search exposing (Search)
import Comet.Types.Tag exposing (Tag)
import Json.Encode as Encode


funcInfo : String -> FunctionInformation
funcInfo name =
    { zome = "posts"
    , functionName = name
    }


createPost : Comet.Port.Id -> PostContent -> List Tag -> Cmd msg
createPost id post tags =
    Comet.Port.callFunction
        { functionInfo = funcInfo "create_post"
        , value =
            Encode.object
                [ ( "post", Comet.Types.PostContent.encode post )
                , ( "tags", Encode.list Encode.int tags )
                ]
        , id = id
        }


crosspost : Comet.Port.Id -> Address -> List Tag -> Cmd msg
crosspost id post tags =
    Comet.Port.callFunction
        { functionInfo = funcInfo "crosspost"
        , value =
            Encode.object
                [ ( "post_address", Encode.string post )
                , ( "tags", Encode.list Encode.int tags )
                ]
        , id = id
        }


deletePost : Comet.Port.Id -> Address -> Cmd msg
deletePost id post =
    Comet.Port.callFunction
        { functionInfo = funcInfo "delete_post"
        , value =
            Encode.object
                [ ( "address", Encode.string post ) ]
        , id = id
        }


postTags : Comet.Port.Id -> Address -> Cmd msg
postTags id post =
    Comet.Port.callFunction
        { functionInfo = funcInfo "post_tags"
        , value =
            Encode.object
                [ ( "address", Encode.string post ) ]
        , id = id
        }


readPost : Comet.Port.Id -> Address -> Cmd msg
readPost id post =
    Comet.Port.callFunction
        { functionInfo = funcInfo "read_post"
        , value =
            Encode.object
                [ ( "address", Encode.string post ) ]
        , id = id
        }


search : Comet.Port.Id -> Search -> Bool -> Cmd msg
search id query excludeCrossposts =
    Comet.Port.callFunction
        { functionInfo = funcInfo "search"
        , value =
            Encode.object
                [ ( "query", Comet.Types.Search.encode query )
                , ( "exclude_crossposts", Encode.bool excludeCrossposts )
                ]
        , id = id
        }


updatePost : Comet.Port.Id -> Address -> Post -> Cmd msg
updatePost id oldAddress newPost =
    Comet.Port.callFunction
        { functionInfo = funcInfo "update_post"
        , value =
            Encode.object
                [ ( "old_address", Encode.string oldAddress )
                , ( "new_post", Comet.Types.Post.encode newPost )
                ]
        , id = id
        }


userPosts : Comet.Port.Id -> Address -> Cmd msg
userPosts id author =
    Comet.Port.callFunction
        { functionInfo = funcInfo "user_posts"
        , value =
            Encode.object
                [ ( "address", Encode.string author ) ]
        , id = id
        }
