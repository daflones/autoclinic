{
  "nodes": [
    {
      "parameters": {
        "documentId": {
          "__rl": true,
          "value": "1yQ1y8DkPefBN4kgPpm9oH29EPooqhnoWJyAIOjmjvdY",
          "mode": "list",
          "cachedResultName": "Leads - Instagram",
          "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1yQ1y8DkPefBN4kgPpm9oH29EPooqhnoWJyAIOjmjvdY/edit?usp=drivesdk"
        },
        "sheetName": {
          "__rl": true,
          "value": "gid=0",
          "mode": "list",
          "cachedResultName": "Página1",
          "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1yQ1y8DkPefBN4kgPpm9oH29EPooqhnoWJyAIOjmjvdY/edit#gid=0"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.5,
      "position": [
        832,
        368
      ],
      "id": "c9d1c47d-ed06-40a2-b215-25b0255c8248",
      "name": "Get List",
      "executeOnce": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "0zM5Fiy0sow3Y9ZC",
          "name": "Google Sheets account"
        }
      }
    },
    {
      "parameters": {
        "options": {}
      },
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "position": [
        1200,
        368
      ],
      "id": "190b0415-83a0-4157-99ea-fd79ed539b26",
      "name": "Loop Over Items"
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "47c39cd1-b0d9-4863-a418-dba6e53556ef",
              "name": "profileUrl",
              "value": "={{ $json.inputUrl }}",
              "type": "string"
            },
            {
              "id": "368b87ff-55ca-4ae4-ae1c-93b7d486a10e",
              "name": "username",
              "value": "={{ $json.username }}",
              "type": "string"
            },
            {
              "id": "8c365e02-089d-4ecc-835b-5df92f178228",
              "name": "name",
              "value": "={{ $json.fullName }}",
              "type": "string"
            },
            {
              "id": "d23d1744-16b9-4184-be32-51e7049afbc9",
              "name": "bio",
              "value": "={{ $json.biography }}",
              "type": "string"
            },
            {
              "id": "4127f838-1c96-4aa6-9cfd-a4a6b2af9ffc",
              "name": "externalUrl",
              "value": "={{ $json.externalUrlShimmed }}",
              "type": "string"
            },
            {
              "id": "47738885-4536-4caf-a065-86556569f46f",
              "name": "followersCount",
              "value": "={{ $json.followersCount }}",
              "type": "number"
            },
            {
              "id": "f6040413-f7be-4452-8416-b352dd5e319c",
              "name": "followsCount",
              "value": "={{ $json.followsCount }}",
              "type": "number"
            },
            {
              "id": "c66d2fdc-6461-4fce-b683-67d8718507aa",
              "name": "profilePicUrl",
              "value": "={{ $json.profilePicUrl }}",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        2128,
        384
      ],
      "id": "8f47d4c0-cd7c-42ff-94dd-1f94b8da904e",
      "name": "Main Data"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=apify_api_2yOkR2OofOdCBave6ruk8mvuOn4HdB30fw8f",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n    \"addParentData\": false,\n    \"directUrls\": [\n      \"{{ $('Loop Over Items').item.json.url }}\"\n    ],\n    \"enhanceUserSearchWithFacebookPage\": false,\n    \"isUserReelFeedURL\": false,\n    \"isUserTaggedFeedURL\": false,\n    \"resultsLimit\": 200,\n    \"resultsType\": \"details\",\n    \"searchLimit\": 1,\n    \"searchType\": \"hashtag\"\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        1840,
        400
      ],
      "id": "8116e6f9-bdbb-4d2f-9486-72fc2dbf6d60",
      "name": "[Apify] IG Scrape - Run Actor",
      "onError": "continueErrorOutput"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "a0813251-c368-4d51-a148-9d46981e8df6",
              "leftValue": "={{ $json.id }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "exists",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        1616,
        384
      ],
      "id": "3d4cda2b-9f02-48ab-b3f3-0bc2b04fb6f7",
      "name": "If Exists"
    },
    {
      "parameters": {
        "modelId": {
          "__rl": true,
          "value": "gpt-4o-mini",
          "mode": "list",
          "cachedResultName": "GPT-4O-MINI"
        },
        "messages": {
          "values": [
            {
              "content": "=# Função\nEncontrar um número de telefone dentro de um código HTML.\n\n# Dicas e Instruções\n- O número provavelmente está perto da palavra \"whatsapp\" e deve começar com 55;\n- Retorne APENAS o número ou \"NOT FOUND\";\n- Retorne o número no formato 55DD9XXXXYYYY. Alguns exemplos são:\n  - 5541999465337, 5511987564738 ee 5541999874665;\n- Caso não encontre o número ou esteja undefined, retorne \"NOT FOUND\".\nE nao escreva nada alem do que é dito e nem dê instruções de nada.\n{{ $json.html }}"
            }
          ]
        },
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1.8,
      "position": [
        3072,
        368
      ],
      "id": "1488ef0c-d9aa-4098-b73e-83a248b6b0b6",
      "name": "OpenAI",
      "credentials": {
        "openAiApi": {
          "id": "m9T021LwI4fmOEvs",
          "name": "OpenAi account"
        }
      },
      "onError": "continueErrorOutput"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=apify_api_2yOkR2OofOdCBave6ruk8mvuOn4HdB30fw8f",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n    \"breakpointLocation\": \"NONE\",\n    \"browserLog\": false,\n    \"closeCookieModals\": false,\n    \"debugLog\": false,\n    \"downloadCss\": true,\n    \"downloadMedia\": true,\n    \"excludes\": [\n        {\n            \"glob\": \"/**/*.{png,jpg,jpeg,pdf}\"\n        }\n    ],\n    \"globs\": [\n        {\n            \"glob\": \"https://crawlee.dev/*/*\"\n        }\n    ],\n    \"headless\": true,\n    \"ignoreCorsAndCsp\": false,\n    \"ignoreSslErrors\": false,\n    \"injectJQuery\": true,\n    \"keepUrlFragments\": false,\n    \"linkSelector\": \"a[href]\",\n    \"pageFunction\": \"// The function accepts a single argument: the \\\"context\\\" object.\\n// For a complete list of its properties and functions,\\n// see https://apify.com/apify/web-scraper#page-function \\nasync function pageFunction(context) {\\n    // This statement works as a breakpoint when you're trying to debug your code. Works only with Run mode: DEVELOPMENT!\\n    // debugger; \\n\\n    // jQuery is handy for finding DOM elements and extracting data from them.\\n    // To use it, make sure to enable the \\\"Inject jQuery\\\" option.\\n    const $ = context.jQuery;\\n    return {\\n        url: context.request.url,\\n        html: $(\\\"html\\\").html()\\n    };\\n}\",\n    \"postNavigationHooks\": \"// We need to return array of (possibly async) functions here.\\n// The functions accept a single argument: the \\\"crawlingContext\\\" object.\\n[\\n    async (crawlingContext) => {\\n        // ...\\n    },\\n]\",\n    \"preNavigationHooks\": \"// We need to return array of (possibly async) functions here.\\n// The functions accept two arguments: the \\\"crawlingContext\\\" object\\n// and \\\"gotoOptions\\\".\\n[\\n    async (crawlingContext, gotoOptions) => {\\n        // ...\\n    },\\n]\\n\",\n    \"proxyConfiguration\": {\n        \"useApifyProxy\": true\n    },\n    \"runMode\": \"DEVELOPMENT\",\n    \"startUrls\": [\n        {\n            \"url\": \"{{ $json.externalUrl }}\",\n            \"method\": \"GET\"\n        }\n    ],\n    \"useChrome\": false,\n    \"waitUntil\": [\n        \"networkidle2\"\n    ]\n}",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        2352,
        384
      ],
      "id": "a67985b5-5d3c-4ee7-960e-8a162ae878a8",
      "name": "[Apify] Webscrape - Run Actor",
      "onError": "continueErrorOutput"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 2
          },
          "conditions": [
            {
              "id": "9d2b470e-5ebc-4310-9fbe-e174d98fcd02",
              "leftValue": "={{ $json.message.content }}",
              "rightValue": "NOT FOUND",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        1568,
        640
      ],
      "id": "764c6a0b-4109-4de2-b34e-98c458c316e6",
      "name": "If Phone # Not Found"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "loose",
            "version": 2
          },
          "conditions": [
            {
              "id": "a0813251-c368-4d51-a148-9d46981e8df6",
              "leftValue": "={{ $json.idd }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "exists",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "looseTypeValidation": true,
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [
        1952,
        816
      ],
      "id": "9da5be90-7724-4004-9dcd-1a3775ef22c5",
      "name": "If Exists1"
    },
    {
      "parameters": {
        "formTitle": "Nicho",
        "formFields": {
          "values": [
            {
              "fieldLabel": "Nicho",
              "placeholder": "Qual o nicho? Exemplo: Salão de Beleza",
              "requiredField": true
            },
            {
              "fieldLabel": "Limite de Busca",
              "placeholder": "Número máximo de instagram's",
              "requiredField": true
            }
          ]
        },
        "options": {
          "path": "instagram-leads"
        }
      },
      "type": "n8n-nodes-base.formTrigger",
      "typeVersion": 2.2,
      "position": [
        64,
        16
      ],
      "id": "e6de6be4-c7af-4467-87c4-969483d27c4d",
      "name": "On form submission",
      "webhookId": "cd2bab6d-4f17-43f5-adf1-a84b300ef67a"
    },
    {
      "parameters": {
        "fieldToSplitOut": "results",
        "options": {}
      },
      "type": "n8n-nodes-base.splitOut",
      "typeVersion": 1,
      "position": [
        592,
        16
      ],
      "id": "a69b6f96-6450-4d2a-a572-5a954d27ee9a",
      "name": "Split Out"
    },
    {
      "parameters": {
        "url": "https://google-search74.p.rapidapi.com",
        "sendQuery": true,
        "queryParameters": {
          "parameters": [
            {
              "name": "query",
              "value": "=site:instagram.com/{{ $('On form submission').item.json.Nicho }}"
            },
            {
              "name": "limit",
              "value": "={{ $('On form submission').item.json['Limite de Busca'] }}"
            },
            {
              "name": "related_keywords",
              "value": "true"
            }
          ]
        },
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "x-rapidapi-host",
              "value": "google-search74.p.rapidapi.com"
            },
            {
              "name": "x-rapidapi-key",
              "value": "={{ $json['rapid-api'] }}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        416,
        16
      ],
      "id": "df24de4b-f2ae-408d-9205-49442f8dc02c",
      "name": "RapidAPI"
    },
    {
      "parameters": {
        "operation": "append",
        "documentId": {
          "__rl": true,
          "value": "1yQ1y8DkPefBN4kgPpm9oH29EPooqhnoWJyAIOjmjvdY",
          "mode": "list",
          "cachedResultName": "Leads - Instagram",
          "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1yQ1y8DkPefBN4kgPpm9oH29EPooqhnoWJyAIOjmjvdY/edit?usp=drivesdk"
        },
        "sheetName": {
          "__rl": true,
          "value": "gid=0",
          "mode": "list",
          "cachedResultName": "Página1",
          "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1yQ1y8DkPefBN4kgPpm9oH29EPooqhnoWJyAIOjmjvdY/edit#gid=0"
        },
        "columns": {
          "mappingMode": "autoMapInputData",
          "value": {
            "url": "={{ $json.url }}",
            "title": "={{ $json.title }}",
            "description": "={{ $json.description }}",
            "timestamp": "={{ $json.timestamp }}"
          },
          "matchingColumns": [],
          "schema": [
            {
              "id": "url",
              "displayName": "url",
              "required": false,
              "defaultMatch": false,
              "display": true,
              "type": "string",
              "canBeUsedToMatch": true,
              "removed": false
            },
            {
              "id": "title",
              "displayName": "title",
              "required": false,
              "defaultMatch": false,
              "display": true,
              "type": "string",
              "canBeUsedToMatch": true,
              "removed": false
            },
            {
              "id": "description",
              "displayName": "description",
              "required": false,
              "defaultMatch": false,
              "display": true,
              "type": "string",
              "canBeUsedToMatch": true,
              "removed": false
            },
            {
              "id": "timestamp",
              "displayName": "timestamp",
              "required": false,
              "defaultMatch": false,
              "display": true,
              "type": "string",
              "canBeUsedToMatch": true,
              "removed": false
            }
          ],
          "attemptToConvertTypes": false,
          "convertFieldsToString": false
        },
        "options": {}
      },
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.5,
      "position": [
        800,
        16
      ],
      "id": "92a12019-f0e9-4d7e-a08d-b85d44366741",
      "name": "Google Sheets",
      "executeOnce": false,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "0zM5Fiy0sow3Y9ZC",
          "name": "Google Sheets account"
        }
      }
    },
    {
      "parameters": {
        "operation": "getAll",
        "tableId": "Leads",
        "returnAll": true,
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "url",
              "condition": "eq",
              "keyValue": "={{ $json.url }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1440,
        384
      ],
      "id": "bb6f07d5-d2b3-44f4-a480-36d6a8ab16b9",
      "name": "Get many rows",
      "alwaysOutputData": true,
      "credentials": {
        "supabaseApi": {
          "id": "eFHTQ1tN41P5mdUL",
          "name": "Supabase - Instagram - Captura de Leads"
        }
      }
    },
    {
      "parameters": {
        "operation": "getAll",
        "tableId": "Leads",
        "returnAll": true,
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "whatsapp",
              "condition": "eq",
              "keyValue": "={{ $json.message.content }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1760,
        816
      ],
      "id": "50f9ee2b-34ff-49f5-a279-fc4527384829",
      "name": "Get many rows1",
      "alwaysOutputData": true,
      "credentials": {
        "supabaseApi": {
          "id": "eFHTQ1tN41P5mdUL",
          "name": "Supabase - Instagram - Captura de Leads"
        }
      }
    },
    {
      "parameters": {
        "tableId": "Leads",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "url",
              "fieldValue": "={{ $('[Apify] Webscrape - Run Actor').item.json.url }}"
            },
            {
              "fieldId": "nome",
              "fieldValue": "={{ $('Main Data').item.json.name }}"
            },
            {
              "fieldId": "follower_count",
              "fieldValue": "={{ $('Main Data').item.json.followersCount }}"
            },
            {
              "fieldId": "whatsapp",
              "fieldValue": "={{ $('If Phone # Not Found').item.json.message.content }}"
            },
            {
              "fieldId": "instancia",
              "fieldValue": "={{ $('Edit Fields').item.json.instancia }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        2144,
        832
      ],
      "id": "a4b89b0d-2092-4e02-89eb-aa702229445c",
      "name": "Create a row",
      "credentials": {
        "supabaseApi": {
          "id": "eFHTQ1tN41P5mdUL",
          "name": "Supabase - Instagram - Captura de Leads"
        }
      }
    },
    {
      "parameters": {
        "tableId": "Leads",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "nome",
              "fieldValue": "={{ $('Main Data').item.json.name }}"
            },
            {
              "fieldId": "follower_count",
              "fieldValue": "={{ $('Main Data').item.json.followersCount }}"
            },
            {
              "fieldId": "whatsapp",
              "fieldValue": "NÃO ENCONTRADO"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        1840,
        624
      ],
      "id": "4a98bba7-3a24-4d9f-ad0e-68832dfb8f2c",
      "name": "Create a row1",
      "credentials": {
        "supabaseApi": {
          "id": "eFHTQ1tN41P5mdUL",
          "name": "Supabase - Instagram - Captura de Leads"
        }
      }
    },
    {
      "parameters": {
        "tableId": "follow_up",
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "whatsapp",
              "fieldValue": "={{ $('Create a row').item.json.whatsapp }}"
            },
            {
              "fieldId": "nome",
              "fieldValue": "={{ $('Create a row').item.json.nome }}"
            },
            {
              "fieldId": "data_follow",
              "fieldValue": "={{ $today.plus(3, \"days\") }}"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        3232,
        816
      ],
      "id": "8aa0af6e-5b97-4301-b2c2-8b179de4dce7",
      "name": "Create a row2",
      "credentials": {
        "supabaseApi": {
          "id": "eFHTQ1tN41P5mdUL",
          "name": "Supabase - Instagram - Captura de Leads"
        }
      }
    },
    {
      "parameters": {
        "resource": "messages-api",
        "instanceName": "={{ $json.instancia }}",
        "remoteJid": "={{ $json.numero }}",
        "messageText": "=Olá, tudo bem? Me chamo Eduardo Daflon, e faço parte da empresa NanoSync. Desenvolvemos soluções para facilitar o atendimento e gestão de clientes pelo WhatsApp. Gostaria de falar com o responsável pela ! Ele(a) se encontra?",
        "options_message": {}
      },
      "type": "n8n-nodes-evolution-api.evolutionApi",
      "typeVersion": 1,
      "position": [
        2992,
        816
      ],
      "id": "f2e65163-50f6-44ce-af22-3ebe0fcb16f9",
      "name": "Enviar texto",
      "credentials": {
        "evolutionApi": {
          "id": "SOCLvyL7Gs518hKi",
          "name": "Evolution account"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "6c9ee470-f51a-4917-b2eb-2833d6d1780a",
              "name": "instancia",
              "value": "eduardo-daflon",
              "type": "string"
            },
            {
              "id": "b991d51c-1373-431e-b890-36a06d227471",
              "name": "apify-api",
              "value": "apify_api_2yOkR2OofOdCBave6ruk8mvuOn4HdB30fw8f",
              "type": "string"
            },
            {
              "id": "4fd2534e-c0eb-4291-b8a4-509f1c2c4357",
              "name": "rapid-api",
              "value": "523d8c8a37msh0bd1917c0a729e5p132269jsnff88e73cd3cb",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        240,
        16
      ],
      "id": "bd2f5bac-f52c-4813-8b35-7b98e47b2ed8",
      "name": "Edit Fields"
    },
    {
      "parameters": {
        "resource": "chat-api",
        "instanceName": "={{ $('Create a row').item.json.instancia }}",
        "numbers": "={{ $json.whatsapp }}"
      },
      "type": "n8n-nodes-evolution-api.evolutionApi",
      "typeVersion": 1,
      "position": [
        2304,
        832
      ],
      "id": "0e7033a0-408a-4137-9559-5386e6fee116",
      "name": "Verificar n mero no whats app",
      "executeOnce": false,
      "credentials": {
        "evolutionApi": {
          "id": "SOCLvyL7Gs518hKi",
          "name": "Evolution account"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict",
            "version": 3
          },
          "conditions": [
            {
              "id": "3624d7d0-03e9-4a95-b6c2-5ffc7f2ffc82",
              "leftValue": "={{ $json.data.exists }}",
              "rightValue": false,
              "operator": {
                "type": "boolean",
                "operation": "true",
                "singleValue": true
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.3,
      "position": [
        2512,
        832
      ],
      "id": "41c45f0b-1c40-4f01-9f40-a3bf81fc04d9",
      "name": "If",
      "executeOnce": false
    },
    {
      "parameters": {
        "operation": "update",
        "tableId": "Leads",
        "matchType": "allFilters",
        "filters": {
          "conditions": [
            {
              "keyName": "whatsapp",
              "condition": "eq",
              "keyValue": "={{ $json.data[0].number }}"
            }
          ]
        },
        "fieldsUi": {
          "fieldValues": [
            {
              "fieldId": "whatsapp",
              "fieldValue": "WHATSAPP INVALIDO"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [
        2624,
        1024
      ],
      "id": "bf3af839-6c0a-4365-9ea7-0a34ac5df9b9",
      "name": "Update a row",
      "credentials": {
        "supabaseApi": {
          "id": "eFHTQ1tN41P5mdUL",
          "name": "Supabase - Instagram - Captura de Leads"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "fc1ad71e-9e21-40e7-ac10-a31dbca23195",
              "name": "numero",
              "value": "={{ $json.data[0].jid }}",
              "type": "string"
            },
            {
              "id": "134b761b-a516-4590-b9ec-1c208fd04614",
              "name": "instancia",
              "value": "={{ $('Edit Fields').first().json.instancia }}",
              "type": "string"
            },
            {
              "id": "4ad69454-963e-4f86-b8bc-c2f2eba14fbb",
              "name": "nome",
              "value": "",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [
        2752,
        816
      ],
      "id": "ca88645f-95c2-4d56-b98c-7cc86995b5a7",
      "name": "Edit Fields1"
    }
  ],
  "connections": {
    "Get List": {
      "main": [
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Loop Over Items": {
      "main": [
        [],
        [
          {
            "node": "Get many rows",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Main Data": {
      "main": [
        [
          {
            "node": "[Apify] Webscrape - Run Actor",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "[Apify] IG Scrape - Run Actor": {
      "main": [
        [
          {
            "node": "Main Data",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If Exists": {
      "main": [
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "[Apify] IG Scrape - Run Actor",
            "type": "main",
            "index": 0
          },
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI": {
      "main": [
        [
          {
            "node": "If Phone # Not Found",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "[Apify] Webscrape - Run Actor": {
      "main": [
        [
          {
            "node": "OpenAI",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If Phone # Not Found": {
      "main": [
        [
          {
            "node": "Create a row1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Get many rows1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If Exists1": {
      "main": [
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Create a row",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "On form submission": {
      "main": [
        [
          {
            "node": "Edit Fields",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Split Out": {
      "main": [
        [
          {
            "node": "Google Sheets",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "RapidAPI": {
      "main": [
        [
          {
            "node": "Split Out",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Sheets": {
      "main": [
        [
          {
            "node": "Get List",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get many rows": {
      "main": [
        [
          {
            "node": "If Exists",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get many rows1": {
      "main": [
        [
          {
            "node": "If Exists1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Create a row": {
      "main": [
        [
          {
            "node": "Verificar n mero no whats app",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Create a row1": {
      "main": [
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Create a row2": {
      "main": [
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Enviar texto": {
      "main": [
        [
          {
            "node": "Create a row2",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Edit Fields": {
      "main": [
        [
          {
            "node": "RapidAPI",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Verificar n mero no whats app": {
      "main": [
        [
          {
            "node": "If",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "If": {
      "main": [
        [
          {
            "node": "Edit Fields1",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Update a row",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Update a row": {
      "main": [
        [
          {
            "node": "Loop Over Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Edit Fields1": {
      "main": [
        [
          {
            "node": "Enviar texto",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "74e487294b634664fd48dc574b753471d4fba2c2e09ad43041d15f01f919e6a5"
  }
}