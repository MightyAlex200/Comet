module SearchResult exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Links exposing (Link)
import Post exposing (Post)
import Tags exposing (Tag)

type alias SearchResult =
    { link : (Link Post)
    , inTermsOf : (List Tag)
    }

decoder : Decoder SearchResult
decoder =
    let
        correctSearchResult link inTermsOf =
            SearchResult
                link
                (List.filterMap String.toInt inTermsOf)
    in
        Decode.map2 correctSearchResult
            (Decode.field "link" (Links.linkDecoder Post.decoder))
            (Decode.field "inTermsOf" (Decode.list Decode.string))
