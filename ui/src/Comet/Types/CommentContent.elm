module Comet.Types.CommentContent exposing (CommentContent, encode)

import Json.Encode as Encode


type alias CommentContent =
    { content : String
    , utcUnixTime : Int
    }


encode : CommentContent -> Encode.Value
encode post =
    Encode.object
        [ ( "content", Encode.string post.content )
        , ( "utc_unix_time", Encode.int post.utcUnixTime )
        ]
