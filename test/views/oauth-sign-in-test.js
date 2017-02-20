import React from "react";
import jsdomify from "jsdomify";
import TestUtils from "react-addons-test-utils";
import {spy} from "sinon";
import {expect} from "chai";
import {retrieveData, getCurrentEndpointKey} from "../../src/utils/session-storage";
import * as C from "../../src/utils/constants";
import url from "url";
import {renderConnectedComponent} from "../helper";
import rewire from "rewire";
import nock from "nock";

var findClass = TestUtils.findRenderedDOMComponentWithClass;

var tokenValidationSpy,
    testUid = "test@test.com",
    popupSuccessParams = { "access-token": "abc" },
    successResp = {
      success: true,
      data: {uid: testUid}
    },
    errorResp = {
      success: false,
      errors: ["Invalid token"]
    },
    successRespHeaders = {
      "access-token": "xyz"
    };

export default function () {
  describe("OAuthSignInButton", () => {
    function popupSuccessMock(provider, targetUrl) {
      let closed = false;

      let popup = {
        closed,
        close: () => {
          closed = true;
        },
        location: targetUrl
      };

      // change url to include token after short interval
      setTimeout(() => {
        let params = `token=${popupSuccessParams["access-token"]}&uid=${encodeURIComponent(testUid)}`;
        popup.location = url.parse(`http://api.dev?${params}`);
      }, 100);

      return popup;
    }

    function popupErrorMock(provider, targetUrl) {
      let closed = false;

      let popup = {
        closed,
        close: () => {
          closed = true;
        },
        location: targetUrl
      };

      // close window without appending credentials to url after short interval
      setTimeout(() => {
        popup.closed = true;
      }, 100);

      return popup;
    }

    [
      "bootstrap",
      "material-ui",
      "default"
    ].forEach(theme => {
      var OAuthSignInButton = rewire(`../../src/views/${theme}/OAuthSignInButton`);
      var oAuthActions = rewire("../../src/actions/oauth-sign-in");

      describe(`${theme} theme`, () => {
        describe("params", () => {
          it("should accept styling params", done => {
            let inputProps = {className: "oauth-class-override"};

            renderConnectedComponent(
              <OAuthSignInButton.default provider="github" {...inputProps} />
            ).then(({instance}) => {
              findClass(instance, "oauth-class-override")
              done();
            }).catch(e => console.log("error:", e));
          });

          it("should allow the use of alternate endpoints", done => {
            let apiUrl = "http://alt.dev";

            tokenValidationSpy = spy(() => successResp);

            nock(apiUrl)
              .get("/auth/validate_token")
              .matchHeader("access-token", ([h]) => h === popupSuccessParams["access-token"])
              .reply(200, tokenValidationSpy, successRespHeaders);

            // mock popup window for successful login
            var popupSpy = spy(popupSuccessMock);
            oAuthActions.__set__("openPopup", popupSpy);
            OAuthSignInButton.__set__("oAuthSignIn", oAuthActions.oAuthSignIn);

            let endpointConfig = [
              {default: {apiUrl: "http://default.dev"}},
              {alt: {apiUrl}}
            ];

            renderConnectedComponent(
              <OAuthSignInButton.default provider="github" endpoint="alt" />
            , endpointConfig).then(({instance, store}) => {
              // click button
              let submitEl = TestUtils.findRenderedDOMComponentWithTag(instance, "button");
              TestUtils.Simulate.click(submitEl);

              setTimeout(() => {
                // ensure popup was created to the correct API endpoint
                let [[popupProvider, popupUrl, popupName]] = popupSpy.args;
                expect(popupName).to.equal("github");
                expect(popupProvider).to.equal("github");
                expect(popupUrl).to.match(/^http:\/\/alt.dev\/auth\/github/);

                // ensure token validation request was called with creds returned from oauth redirect
                expect(tokenValidationSpy.called).to.be.ok;

                // ensure config is set to "default"
                expect(store.getState().auth.getIn(["configure", "currentEndpointKey"])).to.equal("alt");
                expect(getCurrentEndpointKey()).to.equal("alt");

                // ensure user exists in store
                let currentUser = store.getState().auth.get("user");
                expect(currentUser.get("isSignedIn")).to.equal(true);


                done();
              }, 100);

            }).catch(e => console.log("error:", e));

          });
        });

        describe("success", () => {
          it("retrieves auth creds from external oauth login window, makes validation request to API", done => {
            let apiUrl = "http://api.dev";

            tokenValidationSpy = spy(() => successResp);

            nock(apiUrl)
              .get("/auth/validate_token")
              .matchHeader("access-token", ([h]) => h === popupSuccessParams["access-token"])
              .reply(200, tokenValidationSpy, successRespHeaders);

            // mock popup window for successful login
            var popupSpy = spy(popupSuccessMock);
            oAuthActions.__set__("openPopup", popupSpy);
            OAuthSignInButton.__set__("oAuthSignIn", oAuthActions.oAuthSignIn);

            const nextSpy = spy();

            renderConnectedComponent((
              <OAuthSignInButton.default
                next={nextSpy}
                provider="github" />
            ), {apiUrl}).then(({instance, store}) => {

              // click button
              let submitEl = TestUtils.findRenderedDOMComponentWithTag(instance, "button");
              TestUtils.Simulate.click(submitEl);

              setTimeout(() => {
                // ensure popup was created to the correct API endpoint
                let [[popupProvider, popupUrl, popupName]] = popupSpy.args;
                expect(popupName).to.equal("github");
                expect(popupProvider).to.equal("github");
                expect(popupUrl).to.match(/^http:\/\/api.dev\/auth\/github/);

                // ensure token validation request was called with creds returned from oauth redirect
                expect(tokenValidationSpy.called).to.be.ok;

                // ensure config is set to "default"
                expect(store.getState().auth.getIn(["configure", "currentEndpointKey"])).to.equal("default");
                expect(getCurrentEndpointKey()).to.equal("default");

                // ensure creds were set to response of token validation request
                let currentCreds = retrieveData(C.SAVED_CREDS_KEY);
                expect(currentCreds["access-token"]).to.equal(successRespHeaders["access-token"]);

                // ensure user exists in store
                let currentUser = store.getState().auth.get("user");
                expect(currentUser.get("isSignedIn")).to.equal(true);
                expect(currentUser.getIn(["attributes", "uid"])).to.equal(testUid);

                // ensure success modal is visible
                expect(store.getState().auth.getIn(["ui", "oAuthSignInSuccessModalVisible"])).to.equal(true);

                // make sure `next` method was called
                expect(nextSpy.called).to.be.ok;

                done();
              }, 100);

            }).catch(e => console.log("error:", e));
          });
        });

        describe("failure", () => {
          it("cancels authentication when user closes popup", done => {
            let apiUrl = "http://api.dev";

            var popupSpy = spy(popupErrorMock);
            oAuthActions.__set__("openPopup", popupSpy);
            OAuthSignInButton.__set__("oAuthSignIn", oAuthActions.oAuthSignIn);

            const nextSpy = spy();

            renderConnectedComponent(
              <OAuthSignInButton.default provider="github" next={nextSpy} />
            , {apiUrl}).then(({instance, store}) => {
              // click button
              let submitEl = TestUtils.findRenderedDOMComponentWithTag(instance, "button");
              TestUtils.Simulate.click(submitEl);

              setTimeout(() => {
                expect(popupSpy.called).to.be.ok;

                // ensure user is not signed in
                let currentUser = store.getState().auth.get("user");
                expect(currentUser.get("isSignedIn")).to.equal(false);
                expect(currentUser.get("attributes")).to.equal(null);

                // ensure `next` method was NOT called
                expect(nextSpy.called).to.equal(false);

                // ensure error message is visible
                expect(store.getState().auth.getIn(["ui", "oAuthSignInErrorModalVisible"])).to.equal(true);
                done();
              }, 100);

            }).catch(e => console.log("error:", e));
          });

          it("handles token validation failure", done => {
            let apiUrl = "http://api.dev";

            tokenValidationSpy = spy(() => errorResp);

            nock(apiUrl)
              .get("/auth/validate_token")
              .matchHeader("access-token", ([h]) => h === popupSuccessParams["access-token"])
              .reply(401, tokenValidationSpy);

            // mock popup window for successfull oauth, but failed login
            var popupSpy = spy(popupSuccessMock);
            oAuthActions.__set__("openPopup", popupSpy);
            OAuthSignInButton.__set__("oAuthSignIn", oAuthActions.oAuthSignIn);

            renderConnectedComponent(
              <OAuthSignInButton.default provider="github" />
            , {apiUrl}).then(({instance, store}) => {

              // click button
              let submitEl = TestUtils.findRenderedDOMComponentWithTag(instance, "button");

              TestUtils.Simulate.click(submitEl);

              setTimeout(() => {
                // ensure token validation request was made
                expect(tokenValidationSpy.called).to.be.ok;

                // ensure user is not signed in
                let currentUser = store.getState().auth.get("user");
                expect(currentUser.get("isSignedIn")).to.equal(false);
                expect(currentUser.get("attributes")).to.equal(null);

                // ensure error message is visible
                expect(store.getState().auth.getIn(["ui", "oAuthSignInErrorModalVisible"])).to.equal(true);

                done();
              }, 100);
            });
          });
        });
      });
    });
  });
}
