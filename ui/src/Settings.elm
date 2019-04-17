port module Settings exposing
    ( Settings
    , SimpleMarkdownSettings
    , defaultSettings
    , markdownOptions
    , saveSettings
    , settingsUpdated
    )

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
    }


defaultSettings : Settings
defaultSettings =
    { markdownSettings = simpleMarkdownSettings Markdown.defaultOptions
    }


port settingsUpdated : (Settings -> msg) -> Sub msg


port saveSettings : Settings -> Cmd msg
