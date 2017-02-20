import React from "react";
import jsdomify from "jsdomify";
import TestUtils from "react-addons-test-utils";
import {expect} from "chai";
import {renderConnectedComponent} from "../helper";

/*
* Note that we can't use TestUtils to find the rendered components
* because modals are rendered outside of the instance tree.
*/
function findClass (className) {
  let matches = jsdomify.getDocument().getElementsByClassName(className);

  if (matches.length !== 1) {
    let msg = `Expected 1 match to ${className}, instead got ${matches.length}`
    console.log(msg);
    throw msg;
  }

  return matches[0];
};

/*
 * Batch test the functionality shared by the 18 or so modals.
 */
export default function() {
  describe("Modal visibility", () => {
    [
      "/views/default",
      "/views/bootstrap",
      "/views/material-ui"
    ].forEach((theme) => {
      describe(`${theme || "default"} theme`, () => {
        // we have to wait 1 sec to clear all the modals from the dom between
        // tests. this is due to an issue with the Dialog implementation of
        // material-ui.
        after(done => {
          setTimeout(() => {
            jsdomify.getDocument().body.innerHTML = "";
            done();
          }, 1000);
        });

        [
          ["DestroyAccountErrorModal",         "destroyAccountErrorModalVisible",         "destroy-account-error-modal"],
          ["DestroyAccountSuccessModal",       "destroyAccountSuccessModalVisible",       "destroy-account-success-modal"],
          ["EmailSignUpSuccessModal",          "emailSignUpSuccessModalVisible",          "email-sign-up-success-modal"],
          ["FirstTimeLoginErrorModal",         "firstTimeLoginErrorModalVisible",         "first-time-login-error-modal"],
          ["FirstTimeLoginSuccessModal",       "firstTimeLoginSuccessModalVisible",       "first-time-login-success-modal"],
          ["OAuthSignInErrorModal",            "oAuthSignInErrorModalVisible",            "oauth-sign-in-error-modal"],
          ["OAuthSignInSuccessModal",          "oAuthSignInSuccessModalVisible",          "oauth-sign-in-success-modal"],
          ["PasswordResetSuccessModal",        "passwordResetSuccessModalVisible",        "password-reset-success-modal"],
          ["RequestPasswordResetErrorModal",   "requestPasswordResetErrorModalVisible",   "request-password-reset-error-modal"],
          ["RequestPasswordResetSuccessModal", "requestPasswordResetSuccessModalVisible", "request-password-reset-success-modal"],
          ["SignOutErrorModal",                "signOutErrorModalVisible",                "sign-out-error-modal"],
          ["SignOutSuccessModal",              "signOutSuccessModalVisible",              "sign-out-success-modal"],
          ["EmailSignInErrorModal",            "emailSignInErrorModalVisible",            "email-sign-in-error-modal"],
          ["EmailSignInSuccessModal",          "emailSignInSuccessModalVisible",          "email-sign-in-success-modal"],
          ["UpdatePasswordErrorModal",         "updatePasswordErrorModalVisible",         "update-password-error-modal"],
          ["UpdatePasswordSuccessModal",       "updatePasswordSuccessModalVisible",       "update-password-success-modal"]
        ].forEach(([componentName, vizProp, modalClass]) => {
          var {AuthGlobals} = require(`../../src${theme}`);

          describe(componentName, () => {
            it(`modal visibility should correlate with ui.${vizProp} value`, done => {

              let initialState = {ui: {[vizProp]: true}};

              renderConnectedComponent(<AuthGlobals />, undefined, initialState).then(({store}) => {
                // ensure modal is visible
                expect(findClass(modalClass)).to.be.ok;

                // ensure close button is present
                let closeBtnEl = findClass(`${modalClass}-close`);

                // ensure close button closes modal
                TestUtils.Simulate.click(closeBtnEl);
                expect(store.getState().auth.getIn(["ui", vizProp])).to.equal(false);

                done();
              }).catch(e => console.log("error:", e.stack));
            });
          });
        });
      })
    });
  });
}
