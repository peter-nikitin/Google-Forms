/**
 *
 *
 * The above comment directs Apps Script to limit the scope of file
 * access for this add-on. It specifies that this add-on will only
 * attempt to read or modify the files in which the add-on is used,
 * and not all of the user's files. The authorization request message
 * presented to users will reflect this limited scope.
 */

/**
 * A global constant String holding the title of the add-on. This is
 * used to identify the add-on in the notification emails.
 */
var ADDON_TITLE = "Google From -> Mindbox integration";

/**
 * A global constant 'notice' text to include with each email
 * notification.
 */
var NOTICE = `Этот аддон предназначен для интеграции гугль формы с Mindbox. В момент 
отправки данных в форме происходит вызов API Mindbox в котром передаются все данные`;

/**
 * Adds a custom menu to the active form to show the add-on sidebar.
 *
 * @param {object} e The event parameter for a simple onOpen trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode.
 */
function onOpen(e) {
    FormApp.getUi()
        .createAddonMenu()
        .addItem("Настройка интеграции", "showSidebar")
        .addToUi();
}

/**
 * Runs when the add-on is installed.
 *
 * @param {object} e The event parameter for a simple onInstall trigger. To
 *     determine which authorization mode (ScriptApp.AuthMode) the trigger is
 *     running in, inspect e.authMode. (In practice, onInstall triggers always
 *     run in AuthMode.FULL, but onOpen triggers may be AuthMode.LIMITED or
 *     AuthMode.NONE).
 */
function onInstall(e) {
    onOpen(e);
}

/**
 * Opens a sidebar in the form containing the add-on's user interface for
 * configuring the notifications this add-on will produce.
 */
function showSidebar() {
    var ui = HtmlService.createHtmlOutputFromFile("sidebar").setTitle(
        "Интеграция с Mindbox"
    );
    FormApp.getUi().showSidebar(ui);
}

/**
 * Opens a purely-informational dialog in the form explaining details about
 * this add-on.
 */
function showAbout() {
    var ui = HtmlService.createHtmlOutputFromFile("about")
        .setWidth(420)
        .setHeight(270);
    FormApp.getUi().showModalDialog(ui, "About Form Notifications");
}

function logAuth() {
    var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    Logger.log(authInfo.getAuthorizationStatus());
}

/**
 * Save sidebar settings to this form's Properties, and update the onFormSubmit
 * trigger as needed.
 *
 * @param {Object} settings An Object containing key-value
 *      pairs to store.
 */
function saveSettings(settings) {
    PropertiesService.getDocumentProperties().setProperties(settings);
    adjustFormSubmitTrigger();
}

/**
 * Queries the User Properties and adds additional data required to populate
 * the sidebar UI elements.
 *
 * @return {Object} A collection of Property values and
 *     related data used to fill the configuration sidebar.
 */
function getSettings() {
    var settings = PropertiesService.getDocumentProperties().getProperties();
    var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);

    // Get field items in the form and compile a list
    //   of their titles and IDs.
    var form = FormApp.getActiveForm();
    var formItems = form.getItems();
    settings.formItems = [];

    for (var i = 0; i < formItems.length; i++) {
        settings.formItems.push({
            title: formItems[i].getTitle(),
            id: formItems[i].getId(),
            type: formItems[i].getType(),
        });
    }
    return settings;
}

/**
 * Adjust the onFormSubmit trigger based on user's requests.
 */
function adjustFormSubmitTrigger() {
    var form = FormApp.getActiveForm();
    var triggers = ScriptApp.getUserTriggers(form);
    var settings = PropertiesService.getDocumentProperties();

    // Create a new trigger if required; delete existing trigger
    //   if it is not needed.
    var existingTrigger = null;
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getEventType() == ScriptApp.EventType.ON_FORM_SUBMIT) {
            existingTrigger = triggers[i];
            break;
        }
    }

    if (!existingTrigger) {
        var trigger = ScriptApp.newTrigger("respondToFormSubmit")
            .forForm(form)
            .onFormSubmit()
            .create();
    } else if (existingTrigger) {
        ScriptApp.deleteTrigger(existingTrigger);
        var trigger = ScriptApp.newTrigger("respondToFormSubmit")
            .forForm(form)
            .onFormSubmit()
            .create();
    }
}

/**
 * Responds to a form submission event if an onFormSubmit trigger has been
 * enabled.
 *
 * @param {Object} e The event parameter created by a form
 *      submission; see
 *      https://developers.google.com/apps-script/understanding_events
 */
function respondToFormSubmit(e) {
    var settings = PropertiesService.getDocumentProperties();
    var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);

    var formItems = e.response.getItemResponses();
    var bodyToMb = {
        customer: {},
    };
    var endpointId = settings.getProperty("endpoint");
    var operation = settings.getProperty("operation");

    for (var j = 0; j < formItems.length; j++) {
        var filedSettings = settings
            .getProperty(formItems[j].getItem().getId())
            .split("-");

        var fieldType = filedSettings[0];
        var isMultiple = filedSettings[1] === "true";
        var fieldName = filedSettings[2];

        var filedValueText = String(formItems[j].getResponse());

        var fieldValue = isMultiple ? filedValueText.split(",") : filedValueText;

        switch (fieldType) {
            case "none":
                break;

            case "email":
                bodyToMb.customer.email = fieldValue;
                break;

            case "mobilePhone":
                bodyToMb.customer.mobilePhone = fieldValue;
                break;

            case "birthDate":
                bodyToMb.customer.birthDate = fieldValue;
                break;

            case "firstName":
                bodyToMb.customer.firstName = fieldValue;
                break;

            case "lastName":
                bodyToMb.customer.lastName = fieldValue;
                break;

            case "middleName":
                bodyToMb.customer.middleName = fieldValue;
                break;

            case "authenticationTicket":
                bodyToMb.customer.authenticationTicket = fieldValue;
                break;

            case "customFields":
                if (typeof bodyToMb.customer.customFields === "undefined") {
                    bodyToMb.customer.customFields = {};
                }
                bodyToMb.customer.customFields[fieldName] = fieldValue;
                break;

            case "ids":
                if (typeof bodyToMb.customer.ids === "undefined") {
                    bodyToMb.customer.ids = {};
                }
                bodyToMb.customer.ids[fieldName] = fieldValue;
                break;

            default:
                break;
        }
    }
    Logger.log(formItems);
    var url = `https://api.mindbox.ru/v3/operations/async?endpointId=${endpointId}&operation=${operation}`;
    var headers = {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
    };

    var body = JSON.stringify(bodyToMb);

    var options = {
        method: "post",
        headers: headers,
        payload: body,
    };
    UrlFetchApp.fetch(url, options);
}