port module Settings exposing
    ( Settings
    , SimpleMarkdownSettings
    , decode
    , defaultSettings
    , markdownOptions
    , saveSettings
    , settingsUpdated
    )

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)
import KarmaMap exposing (KarmaMap)
import Markdown


type alias SimpleMarkdownSettings =
    { githubFlavored :
        Maybe
            { tables : Bool
            , breaks : Bool
            }
    , defaultHighlighting : Maybe String
    , smartypants : Bool
    }


decodeMDSettings : Decoder SimpleMarkdownSettings
decodeMDSettings =
    let
        ghdecode : Decoder { tables : Bool, breaks : Bool }
        ghdecode =
            Decode.map2 (\tables breaks -> { tables = tables, breaks = breaks })
                (Decode.field "tables" Decode.bool)
                (Decode.field "breaks" Decode.bool)
    in
    Decode.map3 SimpleMarkdownSettings
        (Decode.field "githubFlavored" (Decode.maybe ghdecode))
        (Decode.field "defaultHighlighting" (Decode.maybe Decode.string))
        (Decode.field "smartypants" Decode.bool)


encodeMDSettings : SimpleMarkdownSettings -> Value
encodeMDSettings mdSettings =
    let
        maybeString x =
            case x of
                Just string ->
                    Encode.string string

                Nothing ->
                    Encode.null
    in
    Encode.object
        [ ( "githubFlavored"
          , case mdSettings.githubFlavored of
                Just ghSettings ->
                    Encode.object
                        [ ( "tables", Encode.bool ghSettings.tables )
                        , ( "breaks", Encode.bool ghSettings.breaks )
                        ]

                Nothing ->
                    Encode.null
          )
        , ( "defaultHighlighting", maybeString mdSettings.defaultHighlighting )
        , ( "smartypants", Encode.bool mdSettings.smartypants )
        ]


markdownOptions : SimpleMarkdownSettings -> Markdown.Options
markdownOptions settings =
    { githubFlavored = settings.githubFlavored
    , defaultHighlighting = settings.defaultHighlighting
    , sanitize = True
    , smartypants = settings.smartypants
    }


simpleMarkdownSettings : Markdown.Options -> SimpleMarkdownSettings
simpleMarkdownSettings options =
    { githubFlavored = options.githubFlavored
    , defaultHighlighting = options.defaultHighlighting
    , smartypants = options.smartypants
    }


type alias Settings =
    { markdownSettings : SimpleMarkdownSettings
    , karmaMap : KarmaMap
    }


defaultSettings : Settings
defaultSettings =
    { markdownSettings = simpleMarkdownSettings Markdown.defaultOptions
    , karmaMap = KarmaMap.empty
    }


decode : Decoder Settings
decode =
    Decode.map2 Settings
        (Decode.field "markdownSettings" decodeMDSettings)
        (Decode.field "karmaMap" KarmaMap.decode)


encode : Settings -> Value
encode settings =
    Encode.object
        [ ( "markdownSettings", encodeMDSettings settings.markdownSettings )
        , ( "karmaMap", KarmaMap.encode settings.karmaMap )
        ]


port settingsUpdated : (Value -> msg) -> Sub msg


port saveSettingsPort : Value -> Cmd msg


saveSettings : Settings -> Cmd msg
saveSettings settings =
    saveSettingsPort (encode settings)
