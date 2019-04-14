module Comet.Types.PostContent exposing (PostContent, encode)

import Json.Encode as Encode


type alias PostContent =
    { title : String
    , content : String
    , utcUnixTime : Int
    }


encode : PostContent -> Encode.Value
encode post =
    Encode.object
        [ ( "title", Encode.string post.title )
        , ( "content", Encode.string post.content )
        , ( "utc_unix_time", Encode.int post.utcUnixTime )
        ]
