module Comment exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode
import Http

type alias Comment =
    { content : String
    }

decoder : Decoder Comment
decoder =
    Decode.map Comment
        (Decode.field "content" Decode.string)

createComment : String -> String -> (Result Http.Error String -> a) -> Cmd a
createComment hash content =
    let
        body =
            Http.jsonBody 
                (Encode.object
                    [ ("targetHash", Encode.string hash)
                    , ("commentEntry", 
                        Encode.object
                            [ ("content", Encode.string content) ]
                        )
                    ]
                )
        request =
            Http.post "/fn/comments/commentCreate" body Decode.string
    in
        (\x -> Http.send x request)
