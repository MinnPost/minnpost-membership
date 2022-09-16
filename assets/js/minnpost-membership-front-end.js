;(function($) {
"use strict";

(function (window) {
  function MinnPostMembership(data, settings) {
    this.data = {};

    if (typeof data !== 'undefined') {
      this.data = data;
    }

    this.settings = {};

    if (typeof settings !== 'undefined') {
      this.settings = settings;
    }

    this.previousAmount = '';

    if (typeof this.data.current_user !== 'undefined' && typeof this.data.current_user.previous_amount !== 'undefined') {
      this.previousAmount = this.data.current_user.previous_amount;
    }
  }

  MinnPostMembership.prototype = {
    checkLevel(amount, frequency, type) {
      let thisyear = parseInt(amount) * parseInt(frequency);

      if (typeof this.previousAmount !== 'undefined' && this.previousAmount !== '') {
        let prior_year_amount = parseInt(this.previousAmount.prior_year_contributions, 10);
        const coming_year_amount = parseInt(this.previousAmount.coming_year_contributions, 10);
        let annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      return this.getLevel(thisyear);
    },

    // end checkLevel
    getLevel(thisyear) {
      const level = {
        yearlyAmount: thisyear
      };

      if (thisyear > 0 && thisyear < 60) {
        level.name = 'Bronze';
        level.number = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level.name = 'Silver';
        level.number = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level.name = 'Gold';
        level.number = 3;
      } else if (thisyear > 239) {
        level.name = 'Platinum';
        level.number = 4;
      }

      return level;
    } // end getLevel


  };
  window.MinnPostMembership = new MinnPostMembership(window.minnpost_membership_data, window.minnpost_membership_settings);
})(window);
"use strict";

// plugin
(function ($, window, document, MinnPostMembership) {
  // Create the defaults once
  const pluginName = 'minnpostAmountSelect',
        defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountGroup: '.m-frequency-group',
    amountSelector: '.m-amount-select input[type="radio"]',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description',
    amountField: '.a-amount-field #amount',
    customAmountFrequency: '#amount-item .a-frequency-text-label',
    levelViewer: '.a-show-level',
    levelName: '.a-level',
    userCurrentLevel: '.a-current-level',
    declineBenefits: '.m-decline-benefits-select input[type="radio"]',
    giftSelectionGroup: '.m-membership-gift-selector',
    giftLevel: '.m-gift-level',
    giftSelector: '.m-gift-level .m-form-item input[type="radio"]',
    giftOptionSelector: '.a-gift-option-select',
    giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
    swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    minAmounts: '.m-membership-gift-selector .min-amount',
    declineGiftLevel: '.m-decline-level'
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init() {
      const $frequency = $(this.element).find(this.options.frequencySelector);
      const $form = $(this.element);
      const $suggestedAmount = $(this.options.amountSelector);
      const $amount = $(this.element).find(this.options.amountField);
      const $declineBenefits = $(this.element).find(this.options.declineBenefits);
      const $gifts = $(this.element).find(this.options.giftSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
        $(this.element).find(this.options.declineGiftLevel).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      this.giftOptionSelect();
      this.setRequiredFields($gifts);
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $gifts.on('click', this.onGiftsClick.bind(this)); // because the next url is generated by WordPress based on what the JavaScript does,
      // we should also use the JavaScript to run a form submit when that link is clicked.

      const form = document.querySelector('.m-form-membership');
      const navForSubmit = document.querySelector('.a-pay-url');
      navForSubmit.addEventListener('click', function (event) {
        form.submit();
        event.preventDefault();
      }); // when the form is submitted

      document.querySelectorAll('.m-form-membership').forEach(membershipForm => membershipForm.addEventListener('submit', event => {
        this.onFormSubmit(event);
      }));
    },

    // end init

    /*
     * run an analytics product action
     */
    analyticsProductAction(level, amount, frequency_label, action, step) {
      const product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', action, product, step);
    },

    // end analyticsProductAction

    /*
     * create an analytics product variable
     */
    analyticsProduct(level, amount, frequency_label) {
      const product = {
        id: 'minnpost_' + level.toLowerCase() + '_membership',
        name: 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
        category: 'Donation',
        brand: 'MinnPost',
        variant: frequency_label,
        price: amount,
        quantity: 1
      };
      return product;
    },

    // end analyticsProduct
    onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
      this.checkAndSetLevel(true);
    },

    // end onFrequencyChange
    onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel(true);
    },

    // end onSuggestedAmountChange
    onAmountChange(event) {
      this.clearAmountSelector(event);
      const $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel(true);
      }
    },

    // end onAmountChange
    onDeclineBenefitsChange(event) {
      const $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      const decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }

      $giftSelectionGroup.show();
    },

    // end onDeclineBenefitsChange
    giftOptionSelect() {
      const parent = $(this.options.giftOptionSelector).parent().parent().find('input[type="radio"]');
      $(this.options.giftOptionSelector).change(function () {
        const selectedOption = $(this).children('option:selected').val();

        if ('' !== selectedOption) {
          parent.prop('checked', true);
        }
      });
    },

    // end giftOptionSelect
    onGiftsClick(event) {
      const $gifts = $(this.element).find(this.options.giftSelector).not(this.options.declineGiftLevel);
      const $decline = $(this.element).find(this.options.declineGiftLevel);

      if ($(event.target).is(this.options.declineGiftLevel)) {
        $gifts.prop('checked', false);
        return;
      }

      this.setRequiredFields($gifts);
      $decline.prop('checked', false);
    },

    // end onGiftsClick
    setRequiredFields($gifts) {
      const $checkedGifts = $gifts.filter(':checked');

      if ($checkedGifts) {
        $("[data-required='true']").prop('required', false);
        $checkedGifts.each(function () {
          const setRequired = function () {
            $(this).prop('required', true);
          };

          $("[data-required='true']", $(this).parent()).each(setRequired);
        });
      }
    },

    // end setRequiredFields
    onFormSubmit(event) {
      let amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      const frequency_string = $(this.options.frequencySelector + ':checked').val();
      const frequency = frequency_string.split(' - ')[1];
      const frequency_name = frequency_string.split(' - ')[0];
      const frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      const frequency_label = $('label[for="' + frequency_id + '"]').text();
      const level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      const options = {
        type: 'event',
        category: 'Support Us',
        action: 'Become A Member',
        label: location.pathname
      }; // this tracks an event submission based on the plugin options
      // it also bubbles the event up to submit the form

      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      const hasClass = event.target.classList.contains('m-form-membership-support'); // if this is the main checkout form, send it to the ec plugin as a checkout

      if (hasClass) {
        const product = this.analyticsProduct(level.name, amount, frequency_label);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
      }
    },

    // end onFormSubmit
    clearAmountSelector(event) {
      const $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.prop('checked', false);
    },

    // end clearAmountSelector
    setAmountLabels(frequencyString) {
      const $groups = $(this.options.amountGroup);
      const $selected = $(this.options.amountSelector).filter(':checked');
      const index = $selected.data('index');
      const $customAmountFrequency = $(this.options.customAmountFrequency);
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
      const currentFrequencyLabel = $groups.filter('.active').find('.a-frequency-text-label').first().text();
      $customAmountFrequency.text(currentFrequencyLabel);
    },

    // end setAmountLabels
    setMinAmounts(frequencyString) {
      const $elements = $(this.options.minAmounts);
      $elements.removeClass('active');
      $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
    },

    // end setMinAmounts
    checkAndSetLevel(updated) {
      let amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      const frequency_string = $(this.options.frequencySelector + ':checked').val();
      const frequency = frequency_string.split(' - ')[1];
      const frequency_name = frequency_string.split(' - ')[0];
      const frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      const frequency_label = $('label[for="' + frequency_id + '"]').text();
      const level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
      this.setEnabledGifts(level);
      this.analyticsProductAction(level.name, amount, frequency_label, 'select_content', 1);
    },

    // end checkAndSetLevel
    showNewLevel(element, options, level) {
      let member_level_prefix = '';
      let old_level = '';
      let levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      const decodeHtmlEntity = function (str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.levelViewer).length > 0) {
        $(options.levelViewer).prop('class', 'a-show-level a-show-level-' + level.name.toLowerCase());

        if ($(options.userCurrentLevel).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.levelViewer).length > 0) {
            levelViewerContainer = options.levelViewer + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level.name.toLowerCase()) {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('changed')));
          } else {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('not-changed')));
          }
        }

        $(options.levelName, options.levelViewer).text(level.name);
      }
    },

    // end showNewLevel
    setEnabledGifts(level) {
      const setEnabled = function () {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };

      $(this.options.giftSelector).each(setEnabled);

      if ($(this.options.swagSelector).not('#swag-decline').is(':enabled')) {
        $('.swag-disabled').removeClass('active');
        $('.swag-enabled').addClass('active');
      } else {
        $('.swag-disabled').addClass('active');
        $('.swag-enabled').removeClass('active');
      }
    } // end setEnabledGifts


  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      const $button = $(this);
      const $status = $('.m-benefit-message', $(this).parent());
      const $select = $('select', $(this).parent());
      const settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      let data = {};
      const benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          action: 'benefit_form_submit',
          minnpost_membership_benefit_form_nonce: $button.data('benefit-nonce'),
          current_url: $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          instance_id: $('[name="instance-id-' + $button.val() + '"]').val(),
          post_id: $button.val(),
          is_ajax: '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }

    $('.a-refresh-page').on('click', function (event) {
      event.preventDefault();
      location.reload();
    });
  });
})(jQuery);
"use strict";

const button = document.querySelector('.m-support-cta-top .a-support-button');

if (button) {
  button.addEventListener('click', function (event) {
    let value = '';
    const svg = button.querySelector('svg');

    if (null !== svg) {
      const attribute = svg.getAttribute('title');

      if (null !== attribute) {
        value = attribute + ' ';
      }
    }

    value = value + button.textContent;
    wp.hooks.doAction('minnpostMembershipAnalyticsEvent', 'event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
  });
}
"use strict";

// plugin
(function ($, window, document, MinnPostMembership, undefined) {
  // Create the defaults once
  const pluginName = 'minnpostMembership',
        defaults = {
    debug: false,
    // this can be set to true on page level options
    amount_viewer: '.amount h3',
    frequency_selector_in_levels: '.a-form-item-membership-frequency',
    frequency_selector_in_levels_type: 'select',
    levels_container: '.o-membership-member-levels',
    single_level_container: '.m-membership-member-level',
    single_level_summary_selector: '.m-member-level-brief',
    flipped_items: 'div.amount, div.enter',
    level_frequency_text_selector: '.show-frequency',
    choose_amount_selector_in_levels: '.amount .a-button-flip',
    amount_selector_in_levels: '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },

    catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },

    // end catchLinks
    levelFlipper(element, options) {
      const that = this;
      let amount = 0;
      let level = '';
      let level_number = 0;
      let frequency_string = '';
      let frequency = '';
      let frequency_name = '';

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, element, options);
            that.changeFrequency(frequency_string, level.name, element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level.name, element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, element, options);
          event.preventDefault();
        });
      }
    },

    // end levelFlipper
    checkLevel(amount, frequency, type, element, options) {
      const level = MinnPostMembership.checkLevel(amount, frequency, type);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level.name) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },

    // end checkLevel
    changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        let range = $(options.amount_viewer, $(this)).text();
        const month_value = $(options.amount_viewer, $(this)).data('month');
        const year_value = $(options.amount_viewer, $(this)).data('year');
        const once_value = $(options.amount_viewer, $(this)).data('one-time');
        const frequency_name = selected.split(' - ')[0];
        const frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },

    // end changeFrequency
    changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        let range = $(options.amount_viewer, $(this)).text();
        const month_value = $(options.amount_viewer, $(this)).data('month');
        const year_value = $(options.amount_viewer, $(this)).data('year');
        const once_value = $(options.amount_viewer, $(this)).data('one-time');
        const frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },

    // end changeAmountPreview
    startLevelClick(element, options) {
      $('.start-level').click(function () {
        const level_class = $(this).prop('class');
        const level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick


  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document, MinnPostMembership);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsInllYXJseUFtb3VudCIsIm5hbWUiLCJudW1iZXIiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwiJCIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwibGV2ZWxWaWV3ZXIiLCJsZXZlbE5hbWUiLCJ1c2VyQ3VycmVudExldmVsIiwiZGVjbGluZUJlbmVmaXRzIiwiZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZ2lmdExldmVsIiwiZ2lmdFNlbGVjdG9yIiwiZ2lmdE9wdGlvblNlbGVjdG9yIiwiZ2lmdExhYmVsIiwic3dhZ0VsaWdpYmlsaXR5VGV4dCIsInN3YWdTZWxlY3RvciIsInN3YWdMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZUdpZnRMZXZlbCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkZm9ybSIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRnaWZ0cyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJnaWZ0T3B0aW9uU2VsZWN0Iiwic2V0UmVxdWlyZWRGaWVsZHMiLCJvbkdpZnRzQ2xpY2siLCJmb3JtIiwicXVlcnlTZWxlY3RvciIsIm5hdkZvclN1Ym1pdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsInN1Ym1pdCIsInByZXZlbnREZWZhdWx0IiwicXVlcnlTZWxlY3RvckFsbCIsImZvckVhY2giLCJtZW1iZXJzaGlwRm9ybSIsIm9uRm9ybVN1Ym1pdCIsImFuYWx5dGljc1Byb2R1Y3RBY3Rpb24iLCJmcmVxdWVuY3lfbGFiZWwiLCJhY3Rpb24iLCJzdGVwIiwicHJvZHVjdCIsImFuYWx5dGljc1Byb2R1Y3QiLCJ3cCIsImhvb2tzIiwiZG9BY3Rpb24iLCJpZCIsInRvTG93ZXJDYXNlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImNhdGVnb3J5IiwiYnJhbmQiLCJ2YXJpYW50IiwicHJpY2UiLCJxdWFudGl0eSIsInRhcmdldCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCIkdGFyZ2V0IiwiJGdpZnRTZWxlY3Rpb25Hcm91cCIsImRlY2xpbmUiLCJoaWRlIiwic2hvdyIsInBhcmVudCIsImNoYW5nZSIsInNlbGVjdGVkT3B0aW9uIiwiY2hpbGRyZW4iLCIkZGVjbGluZSIsIiRjaGVja2VkR2lmdHMiLCJlYWNoIiwic2V0UmVxdWlyZWQiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInRleHQiLCJsYWJlbCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJoYXNDbGFzcyIsImNsYXNzTGlzdCIsImNvbnRhaW5zIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsIiRlbGVtZW50cyIsInVwZGF0ZWQiLCJzaG93TmV3TGV2ZWwiLCJzZXRFbmFibGVkR2lmdHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxWaWV3ZXJDb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwicmVwbGFjZSIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInNldEVuYWJsZWQiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZSIsImN1cnJlbnRfdXJsIiwiaW5zdGFuY2VfaWQiLCJwb3N0X2lkIiwiaXNfYWpheCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJ2YWx1ZSIsInN2ZyIsImF0dHJpYnV0ZSIsImdldEF0dHJpYnV0ZSIsInRleHRDb250ZW50IiwidW5kZWZpbmVkIiwiZGVidWciLCJhbW91bnRfdmlld2VyIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZSIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwid3JhcEFsbCIsImNsb3Nlc3QiLCJjaGFuZ2VGcmVxdWVuY3kiLCJjaGFuZ2VBbW91bnRQcmV2aWV3Iiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFDLFVBQVVBLE1BQVYsRUFBa0I7RUFDbEIsU0FBU0Msa0JBQVQsQ0FBNEJDLElBQTVCLEVBQWtDQyxRQUFsQyxFQUE0QztJQUMzQyxLQUFLRCxJQUFMLEdBQVksRUFBWjs7SUFDQSxJQUFJLE9BQU9BLElBQVAsS0FBZ0IsV0FBcEIsRUFBaUM7TUFDaEMsS0FBS0EsSUFBTCxHQUFZQSxJQUFaO0lBQ0E7O0lBRUQsS0FBS0MsUUFBTCxHQUFnQixFQUFo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LENBa1VmOzs7RUFsVWUsQ0FBbkIsQ0FqQzhELENBb1czRDtFQUVIO0VBQ0E7O0VBQ0F4SCxDQUFDLENBQUM0SSxFQUFGLENBQUsxSSxVQUFMLElBQW1CLFVBQVUwQixPQUFWLEVBQW1CO0lBQ3JDLE9BQU8sS0FBS3lFLElBQUwsQ0FBVSxZQUFZO01BQzVCLElBQUksQ0FBQ3JHLENBQUMsQ0FBQzFCLElBQUYsQ0FBTyxJQUFQLEVBQWEsWUFBWTRCLFVBQXpCLENBQUwsRUFBMkM7UUFDMUNGLENBQUMsQ0FBQzFCLElBQUYsQ0FBTyxJQUFQLEVBQWEsWUFBWTRCLFVBQXpCLEVBQXFDLElBQUl3QixNQUFKLENBQVcsSUFBWCxFQUFpQkUsT0FBakIsQ0FBckM7TUFDQTtJQUNELENBSk0sQ0FBUDtFQUtBLENBTkQ7QUFPQSxDQS9XRCxFQStXR2lILE1BL1dILEVBK1dXekssTUEvV1gsRUErV21CNkIsUUEvV25CLEVBK1c2QjVCLGtCQS9XN0IiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKHdpbmRvdykge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoZGF0YSwgc2V0dGluZ3MpIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoXG5cdFx0XHR0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHRcdHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCdcblx0XHQpIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWwoYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUpIHtcblx0XHRcdGxldCB0aGlzeWVhciA9IHBhcnNlSW50KGFtb3VudCkgKiBwYXJzZUludChmcmVxdWVuY3kpO1xuXHRcdFx0aWYgKFxuXHRcdFx0XHR0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJydcblx0XHRcdCkge1xuXHRcdFx0XHRsZXQgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludChcblx0XHRcdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucyxcblx0XHRcdFx0XHQxMFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludChcblx0XHRcdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0bGV0IGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCxcblx0XHRcdFx0XHQxMFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKHR5cGUgPT09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoXG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQsXG5cdFx0XHRcdFx0Y29taW5nX3llYXJfYW1vdW50LFxuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKHRoaXN5ZWFyKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWwodGhpc3llYXIpIHtcblx0XHRcdGNvbnN0IGxldmVsID0ge1xuXHRcdFx0XHR5ZWFybHlBbW91bnQ6IHRoaXN5ZWFyLFxuXHRcdFx0fTtcblx0XHRcdGlmICh0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDE7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSh3aW5kb3cpO1xuIiwiLy8gcGx1Z2luXG4oZnVuY3Rpb24gKCQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0Y29uc3QgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdFx0ZGVmYXVsdHMgPSB7XG5cdFx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRcdGN1c3RvbUFtb3VudEZyZXF1ZW5jeTogJyNhbW91bnQtaXRlbSAuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcsXG5cdFx0XHRsZXZlbFZpZXdlcjogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdFx0dXNlckN1cnJlbnRMZXZlbDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdFx0ZGVjbGluZUJlbmVmaXRzOiAnLm0tZGVjbGluZS1iZW5lZml0cy1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0XHRnaWZ0TGV2ZWw6ICcubS1naWZ0LWxldmVsJyxcblx0XHRcdGdpZnRTZWxlY3RvcjogJy5tLWdpZnQtbGV2ZWwgLm0tZm9ybS1pdGVtIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRnaWZ0T3B0aW9uU2VsZWN0b3I6ICcuYS1naWZ0LW9wdGlvbi1zZWxlY3QnLFxuXHRcdFx0Z2lmdExhYmVsOiAnLm0tZ2lmdC1sZXZlbCAubS1mb3JtLWl0ZW0gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDpcblx0XHRcdFx0Jy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0XHRzd2FnU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdFx0ZGVjbGluZUdpZnRMZXZlbDogJy5tLWRlY2xpbmUtbGV2ZWwnLFxuXHRcdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQoKSB7XG5cdFx0XHRjb25zdCAkZnJlcXVlbmN5ID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvclxuXHRcdFx0KTtcblx0XHRcdGNvbnN0ICRmb3JtID0gJCh0aGlzLmVsZW1lbnQpO1xuXHRcdFx0Y29uc3QgJHN1Z2dlc3RlZEFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKTtcblx0XHRcdGNvbnN0ICRhbW91bnQgPSAkKHRoaXMuZWxlbWVudCkuZmluZCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpO1xuXHRcdFx0Y29uc3QgJGRlY2xpbmVCZW5lZml0cyA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgJGdpZnRzID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQodGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rvcik7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdCEoXG5cdFx0XHRcdFx0JGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0JGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5sZW5ndGggPiAwXG5cdFx0XHRcdClcblx0XHRcdCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkpO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbChmYWxzZSk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oJ2NoYW5nZScsIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKFxuXHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0dGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpXG5cdFx0XHQpO1xuXHRcdFx0JGFtb3VudC5vbigna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSk7XG5cblx0XHRcdGlmICghKCRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkZ2lmdHMubGVuZ3RoID4gMCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdGlmICgkZ2lmdHMubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKS5pcygnOmNoZWNrZWQnKSkge1xuXHRcdFx0XHQkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbClcblx0XHRcdFx0XHQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZSgpO1xuXHRcdFx0dGhpcy5naWZ0T3B0aW9uU2VsZWN0KCk7XG5cdFx0XHR0aGlzLnNldFJlcXVpcmVkRmllbGRzKCRnaWZ0cyk7XG5cblx0XHRcdCRkZWNsaW5lQmVuZWZpdHMub24oXG5cdFx0XHRcdCdjaGFuZ2UnLFxuXHRcdFx0XHR0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlLmJpbmQodGhpcylcblx0XHRcdCk7XG5cdFx0XHQkZ2lmdHMub24oJ2NsaWNrJywgdGhpcy5vbkdpZnRzQ2xpY2suYmluZCh0aGlzKSk7XG5cblx0XHRcdC8vIGJlY2F1c2UgdGhlIG5leHQgdXJsIGlzIGdlbmVyYXRlZCBieSBXb3JkUHJlc3MgYmFzZWQgb24gd2hhdCB0aGUgSmF2YVNjcmlwdCBkb2VzLFxuXHRcdFx0Ly8gd2Ugc2hvdWxkIGFsc28gdXNlIHRoZSBKYXZhU2NyaXB0IHRvIHJ1biBhIGZvcm0gc3VibWl0IHdoZW4gdGhhdCBsaW5rIGlzIGNsaWNrZWQuXG5cdFx0XHRjb25zdCBmb3JtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm0tZm9ybS1tZW1iZXJzaGlwJyk7XG5cdFx0XHRjb25zdCBuYXZGb3JTdWJtaXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYS1wYXktdXJsJyk7XG5cdFx0XHRuYXZGb3JTdWJtaXQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0Zm9ybS5zdWJtaXQoKTtcblx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHQvLyB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZFxuXHRcdFx0ZG9jdW1lbnRcblx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5tLWZvcm0tbWVtYmVyc2hpcCcpXG5cdFx0XHRcdC5mb3JFYWNoKChtZW1iZXJzaGlwRm9ybSkgPT5cblx0XHRcdFx0XHRtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KGV2ZW50KTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHQvKlxuXHRcdCAqIHJ1biBhbiBhbmFseXRpY3MgcHJvZHVjdCBhY3Rpb25cblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uLCBzdGVwKSB7XG5cdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdCk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdCdldmVudCcsXG5cdFx0XHRcdGFjdGlvbixcblx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdFx0c3RlcFxuXHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0Lypcblx0XHQgKiBjcmVhdGUgYW4gYW5hbHl0aWNzIHByb2R1Y3QgdmFyaWFibGVcblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0KGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHtcblx0XHRcdFx0aWQ6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdG5hbWU6XG5cdFx0XHRcdFx0J01pbm5Qb3N0ICcgK1xuXHRcdFx0XHRcdGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcblx0XHRcdFx0XHRsZXZlbC5zbGljZSgxKSArXG5cdFx0XHRcdFx0JyBNZW1iZXJzaGlwJyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdEb25hdGlvbicsXG5cdFx0XHRcdGJyYW5kOiAnTWlublBvc3QnLFxuXHRcdFx0XHR2YXJpYW50OiBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdHByaWNlOiBhbW91bnQsXG5cdFx0XHRcdHF1YW50aXR5OiAxLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBwcm9kdWN0O1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZShldmVudCkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJChldmVudC50YXJnZXQpLnZhbCgpKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cygkKGV2ZW50LnRhcmdldCkudmFsKCkpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvbkZyZXF1ZW5jeUNoYW5nZVxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdCQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKG51bGwpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvcihldmVudCk7XG5cblx0XHRcdGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCk7XG5cdFx0XHRpZiAoJHRhcmdldC5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJHRhcmdldC52YWwoKSkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGRlY2xpbmUgPSAkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cylcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cblx0XHRcdGlmIChkZWNsaW5lID09PSAndHJ1ZScpIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRnaWZ0T3B0aW9uU2VsZWN0KCkge1xuXHRcdFx0Y29uc3QgcGFyZW50ID0gJCh0aGlzLm9wdGlvbnMuZ2lmdE9wdGlvblNlbGVjdG9yKVxuXHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0LnBhcmVudCgpXG5cdFx0XHRcdC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKTtcblx0XHRcdCQodGhpcy5vcHRpb25zLmdpZnRPcHRpb25TZWxlY3RvcikuY2hhbmdlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsZWN0ZWRPcHRpb24gPSAkKHRoaXMpXG5cdFx0XHRcdFx0LmNoaWxkcmVuKCdvcHRpb246c2VsZWN0ZWQnKVxuXHRcdFx0XHRcdC52YWwoKTtcblx0XHRcdFx0aWYgKCcnICE9PSBzZWxlY3RlZE9wdGlvbikge1xuXHRcdFx0XHRcdHBhcmVudC5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBnaWZ0T3B0aW9uU2VsZWN0XG5cblx0XHRvbkdpZnRzQ2xpY2soZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0cyA9ICQodGhpcy5lbGVtZW50KVxuXHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKVxuXHRcdFx0XHQubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKTtcblx0XHRcdGNvbnN0ICRkZWNsaW5lID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsXG5cdFx0XHQpO1xuXHRcdFx0aWYgKCQoZXZlbnQudGFyZ2V0KS5pcyh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCkpIHtcblx0XHRcdFx0JGdpZnRzLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKTtcblx0XHRcdCRkZWNsaW5lLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0fSwgLy8gZW5kIG9uR2lmdHNDbGlja1xuXG5cdFx0c2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKSB7XG5cdFx0XHRjb25zdCAkY2hlY2tlZEdpZnRzID0gJGdpZnRzLmZpbHRlcignOmNoZWNrZWQnKTtcblx0XHRcdGlmICgkY2hlY2tlZEdpZnRzKSB7XG5cdFx0XHRcdCQoXCJbZGF0YS1yZXF1aXJlZD0ndHJ1ZSddXCIpLnByb3AoJ3JlcXVpcmVkJywgZmFsc2UpO1xuXHRcdFx0XHQkY2hlY2tlZEdpZnRzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHNldFJlcXVpcmVkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5wcm9wKCdyZXF1aXJlZCcsIHRydWUpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0JChcIltkYXRhLXJlcXVpcmVkPSd0cnVlJ11cIiwgJCh0aGlzKS5wYXJlbnQoKSkuZWFjaChcblx0XHRcdFx0XHRcdHNldFJlcXVpcmVkXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldFJlcXVpcmVkRmllbGRzXG5cblx0XHRvbkZvcm1TdWJtaXQoZXZlbnQpIHtcblx0XHRcdGxldCBhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcilcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cdFx0XHRpZiAodHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0YW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpLnZhbCgpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X3N0cmluZyA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkudmFsKCk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfaWQgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnByb3AoJ2lkJyk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbGFiZWwgPSAkKFxuXHRcdFx0XHQnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nXG5cdFx0XHQpLnRleHQoKTtcblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZVxuXHRcdFx0KTtcblxuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRcdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRcdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lLFxuXHRcdFx0fTtcblx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdCk7XG5cdFx0XHRjb25zdCBoYXNDbGFzcyA9IGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoXG5cdFx0XHRcdCdtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0J1xuXHRcdFx0KTtcblx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdGlmIChoYXNDbGFzcykge1xuXHRcdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdGZyZXF1ZW5jeV9sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHRcdCdhZGRfdG9fY2FydCcsXG5cdFx0XHRcdFx0cHJvZHVjdFxuXHRcdFx0XHQpO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHRcdCdiZWdpbl9jaGVja291dCcsXG5cdFx0XHRcdFx0cHJvZHVjdFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkZvcm1TdWJtaXRcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3IoZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRzdWdnZXN0ZWRBbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcik7XG5cblx0XHRcdGlmICgkKGV2ZW50LnRhcmdldCkudmFsKCkgPT09ICcnKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHMoZnJlcXVlbmN5U3RyaW5nKSB7XG5cdFx0XHRjb25zdCAkZ3JvdXBzID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50R3JvdXApO1xuXHRcdFx0Y29uc3QgJHNlbGVjdGVkID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpLmZpbHRlcignOmNoZWNrZWQnKTtcblx0XHRcdGNvbnN0IGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoJ2luZGV4Jyk7XG5cdFx0XHRjb25zdCAkY3VzdG9tQW1vdW50RnJlcXVlbmN5ID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmN1c3RvbUFtb3VudEZyZXF1ZW5jeVxuXHRcdFx0KTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQkZ3JvdXBzXG5cdFx0XHRcdC5maWx0ZXIoJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJylcblx0XHRcdFx0LmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdFx0JGdyb3Vwc1xuXHRcdFx0XHQuZmlsdGVyKCcuYWN0aXZlJylcblx0XHRcdFx0LmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScpXG5cdFx0XHRcdC5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cblx0XHRcdGNvbnN0IGN1cnJlbnRGcmVxdWVuY3lMYWJlbCA9ICRncm91cHNcblx0XHRcdFx0LmZpbHRlcignLmFjdGl2ZScpXG5cdFx0XHRcdC5maW5kKCcuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcpXG5cdFx0XHRcdC5maXJzdCgpXG5cdFx0XHRcdC50ZXh0KCk7XG5cdFx0XHQkY3VzdG9tQW1vdW50RnJlcXVlbmN5LnRleHQoY3VycmVudEZyZXF1ZW5jeUxhYmVsKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRNaW5BbW91bnRzKGZyZXF1ZW5jeVN0cmluZykge1xuXHRcdFx0Y29uc3QgJGVsZW1lbnRzID0gJCh0aGlzLm9wdGlvbnMubWluQW1vdW50cyk7XG5cdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0JGVsZW1lbnRzXG5cdFx0XHRcdC5maWx0ZXIoJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJylcblx0XHRcdFx0LmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHR9LCAvLyBlbmQgc2V0TWluQW1vdW50c1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbCh1cGRhdGVkKSB7XG5cdFx0XHRsZXQgYW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpXG5cdFx0XHRcdC5maWx0ZXIoJzpjaGVja2VkJylcblx0XHRcdFx0LnZhbCgpO1xuXHRcdFx0aWYgKHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X3N0cmluZyA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkudmFsKCk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfaWQgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnByb3AoJ2lkJyk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbGFiZWwgPSAkKFxuXHRcdFx0XHQnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nXG5cdFx0XHQpLnRleHQoKTtcblxuXHRcdFx0Y29uc3QgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbChcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lXG5cdFx0XHQpO1xuXHRcdFx0dGhpcy5zaG93TmV3TGV2ZWwodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMsIGxldmVsKTtcblx0XHRcdHRoaXMuc2V0RW5hYmxlZEdpZnRzKGxldmVsKTtcblx0XHRcdHRoaXMuYW5hbHl0aWNzUHJvZHVjdEFjdGlvbihcblx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdCdzZWxlY3RfY29udGVudCcsXG5cdFx0XHRcdDFcblx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbChlbGVtZW50LCBvcHRpb25zLCBsZXZlbCkge1xuXHRcdFx0bGV0IG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdGxldCBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdGxldCBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdGNvbnN0IGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvJiMoXFxkKyk7L2csIGZ1bmN0aW9uIChtYXRjaCwgZGVjKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoZGVjKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPVxuXHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoJChvcHRpb25zLmxldmVsVmlld2VyKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcChcblx0XHRcdFx0XHQnY2xhc3MnLFxuXHRcdFx0XHRcdCdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbC5uYW1lLnRvTG93ZXJDYXNlKClcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0JChvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwpLmxlbmd0aCA+IDAgJiZcblx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPlxuXHRcdFx0XHRcdFx0MFxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRpZiAoKCdhJywgJChvcHRpb25zLmxldmVsVmlld2VyKS5sZW5ndGggPiAwKSkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPVxuXHRcdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZShcblx0XHRcdFx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCxcblx0XHRcdFx0XHRcdFx0Jydcblx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRpZiAob2xkX2xldmVsICE9PSBsZXZlbC5uYW1lLnRvTG93ZXJDYXNlKCkpIHtcblx0XHRcdFx0XHRcdCQobGV2ZWxWaWV3ZXJDb250YWluZXIpLmh0bWwoXG5cdFx0XHRcdFx0XHRcdGRlY29kZUh0bWxFbnRpdHkoXG5cdFx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5kYXRhKCdjaGFuZ2VkJylcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JChsZXZlbFZpZXdlckNvbnRhaW5lcikuaHRtbChcblx0XHRcdFx0XHRcdFx0ZGVjb2RlSHRtbEVudGl0eShcblx0XHRcdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLmRhdGEoJ25vdC1jaGFuZ2VkJylcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KGxldmVsLm5hbWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0cyhsZXZlbCkge1xuXHRcdFx0Y29uc3Qgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JCh0aGlzKS5wcm9wKFxuXHRcdFx0XHRcdCdkaXNhYmxlZCcsXG5cdFx0XHRcdFx0bGV2ZWwueWVhcmx5QW1vdW50IDwgJCh0aGlzKS5kYXRhKCdtaW5ZZWFybHlBbW91bnQnKVxuXHRcdFx0XHQpO1xuXHRcdFx0fTtcblxuXHRcdFx0JCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKS5lYWNoKHNldEVuYWJsZWQpO1xuXG5cdFx0XHRpZiAoXG5cdFx0XHRcdCQodGhpcy5vcHRpb25zLnN3YWdTZWxlY3Rvcikubm90KCcjc3dhZy1kZWNsaW5lJykuaXMoJzplbmFibGVkJylcblx0XHRcdCkge1xuXHRcdFx0XHQkKCcuc3dhZy1kaXNhYmxlZCcpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JCgnLnN3YWctZW5hYmxlZCcpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoJy5zd2FnLWRpc2FibGVkJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHQkKCcuc3dhZy1lbmFibGVkJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoISQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lKSkge1xuXHRcdFx0XHQkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbih0aGlzLCBvcHRpb25zKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KShqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCk7XG4iLCIoZnVuY3Rpb24gKCQpIHtcblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKHRydWUpO1xuXHRcdH1cblx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKS5jbGljayhmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcblx0XHRcdGNvbnN0ICRzdGF0dXMgPSAkKCcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKHRoaXMpLnBhcmVudCgpKTtcblx0XHRcdGNvbnN0ICRzZWxlY3QgPSAkKCdzZWxlY3QnLCAkKHRoaXMpLnBhcmVudCgpKTtcblx0XHRcdGNvbnN0IHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCEnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnKSB7XG5cdFx0XHRcdCQoJy5tLWJlbmVmaXQtbWVzc2FnZScpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCgnUHJvY2Vzc2luZycpLmFkZENsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKS5hZGRDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0bGV0IGRhdGEgPSB7fTtcblx0XHRcdGNvbnN0IGJlbmVmaXRUeXBlID0gJCgnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpO1xuXHRcdFx0aWYgKCdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlKSB7XG5cdFx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2U6XG5cdFx0XHRcdFx0XHQkYnV0dG9uLmRhdGEoJ2JlbmVmaXQtbm9uY2UnKSxcblx0XHRcdFx0XHRjdXJyZW50X3VybDogJCgnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0XHRpbnN0YW5jZV9pZDogJChcblx0XHRcdFx0XHRcdCdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXSdcblx0XHRcdFx0XHQpLnZhbCgpLFxuXHRcdFx0XHRcdHBvc3RfaWQ6ICRidXR0b24udmFsKCksXG5cdFx0XHRcdFx0aXNfYWpheDogJzEnLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCQucG9zdChzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzXG5cdFx0XHRcdFx0XHRcdC5odG1sKHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKFxuXHRcdFx0XHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRpZiAoMCA8ICRzZWxlY3QubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJylcblx0XHRcdFx0XHRcdFx0Lm5vdCgkYnV0dG9uKVxuXHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gZXJyb3Jcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdFx0XHQndW5kZWZpbmVkJyA9PT1cblx0XHRcdFx0XHRcdFx0dHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoJ29wdGlvbicsICRzZWxlY3QpLmVhY2goZnVuY3Rpb24gKGkpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnZhbCgpID09PVxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWVcblx0XHRcdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJylcblx0XHRcdFx0XHRcdFx0Lm5vdCgkYnV0dG9uKVxuXHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJyk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzXG5cdFx0XHRcdFx0XHRcdC5odG1sKHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKFxuXHRcdFx0XHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoMCA8ICQoJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JykubGVuZ3RoKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0XHQkKCcuYS1yZWZyZXNoLXBhZ2UnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9KTtcblx0fSk7XG59KShqUXVlcnkpO1xuIiwiY29uc3QgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyk7XG5pZiAoYnV0dG9uKSB7XG5cdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGxldCB2YWx1ZSA9ICcnO1xuXHRcdGNvbnN0IHN2ZyA9IGJ1dHRvbi5xdWVyeVNlbGVjdG9yKCdzdmcnKTtcblx0XHRpZiAobnVsbCAhPT0gc3ZnKSB7XG5cdFx0XHRjb25zdCBhdHRyaWJ1dGUgPSBzdmcuZ2V0QXR0cmlidXRlKCd0aXRsZScpO1xuXHRcdFx0aWYgKG51bGwgIT09IGF0dHJpYnV0ZSkge1xuXHRcdFx0XHR2YWx1ZSA9IGF0dHJpYnV0ZSArICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFsdWUgPSB2YWx1ZSArIGJ1dHRvbi50ZXh0Q29udGVudDtcblx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHQnZXZlbnQnLFxuXHRcdFx0J1N1cHBvcnQgQ1RBIC0gSGVhZGVyJyxcblx0XHRcdCdDbGljazogJyArIHZhbHVlLFxuXHRcdFx0bG9jYXRpb24ucGF0aG5hbWVcblx0XHQpO1xuXHR9KTtcbn1cbiIsIi8vIHBsdWdpblxuKGZ1bmN0aW9uICgkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAsIHVuZGVmaW5lZCkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0Y29uc3QgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0ZGVidWc6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHRcdGFtb3VudF92aWV3ZXI6ICcuYW1vdW50IGgzJyxcblx0XHRcdGZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdFx0ZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlOiAnc2VsZWN0Jyxcblx0XHRcdGxldmVsc19jb250YWluZXI6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdFx0c2luZ2xlX2xldmVsX2NvbnRhaW5lcjogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHRcdHNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHRcdGZsaXBwZWRfaXRlbXM6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdFx0bGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3I6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdFx0Y2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHRcdGFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0XHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdChyZXNldCwgYW1vdW50KSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0dGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJlxuXHRcdFx0XHRcdGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgPT1cblx0XHRcdFx0XHRcdHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSAmJlxuXHRcdFx0XHRcdGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWVcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQubGVuZ3RoXG5cdFx0XHRcdFx0XHQ/IHRhcmdldFxuXHRcdFx0XHRcdFx0OiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsgJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZShcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcCxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0MTAwMFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXIoZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0Y29uc3QgdGhhdCA9IHRoaXM7XG5cdFx0XHRsZXQgYW1vdW50ID0gMDtcblx0XHRcdGxldCBsZXZlbCA9ICcnO1xuXHRcdFx0bGV0IGxldmVsX251bWJlciA9IDA7XG5cdFx0XHRsZXQgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICgkKG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lcikubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLmVhY2goXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykpLndyYXBBbGwoXG5cdFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQpLm9uKFxuXHRcdFx0XHRcdCdjaGFuZ2UnLFxuXHRcdFx0XHRcdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0XHQpLnJlbW92ZUNsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KVxuXHRcdFx0XHRcdFx0XHRcdC5jbG9zZXN0KG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpXG5cdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGZyZXF1ZW5jeSA9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQpLnZhbChcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3ZpZXdlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0XHQpLmRhdGEoJ2RlZmF1bHQteWVhcmx5Jylcblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeSA9PSAxMikge1xuXHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0KS52YWwoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF92aWV3ZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdkZWZhdWx0LW1vbnRobHknKVxuXHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgK1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdCdcIl0nXG5cdFx0XHRcdFx0XHRcdCkudmFsKCk7XG5cblx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koXG5cdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyxcblx0XHRcdFx0XHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbChcblx0XHRcdFx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyhcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyxcblx0XHRcdFx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoJChvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCkuY2xpY2soXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdCkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdFx0XHQnYWN0aXZlJ1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KVxuXHRcdFx0XHRcdFx0XHQuY2xvc2VzdChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdCQodGhpcykucGFyZW50KClcblx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArXG5cdFx0XHRcdFx0XHRcdFx0J1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgK1xuXHRcdFx0XHRcdFx0XHRcdCdcIl0nXG5cdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWwoYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHR0eXBlXG5cdFx0XHQpO1xuXG5cdFx0XHQkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWwubmFtZSkge1xuXHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHRcdCdhY3RpdmUnXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5KHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bGV0IHJhbmdlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbW9udGhfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnbW9udGgnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IHllYXJfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQneWVhcidcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3Qgb25jZV92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdvbmUtdGltZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeSA9IHBhcnNlSW50KHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSk7XG5cblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMpLnZhbChzZWxlY3RlZCk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzKS5wcm9wKFxuXHRcdFx0XHRcdCdzZWxlY3RlZCcsXG5cdFx0XHRcdFx0c2VsZWN0ZWRcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5yZW1vdmVDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicpIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJykge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KHJhbmdlKTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J2ZyZXF1ZW5jeScsXG5cdFx0XHRcdFx0ZnJlcXVlbmN5XG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3KHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bGV0IHJhbmdlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbW9udGhfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnbW9udGgnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IHllYXJfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQneWVhcidcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3Qgb25jZV92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdvbmUtdGltZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkucmVtb3ZlQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dChyYW5nZSk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3QgbGV2ZWxfY2xhc3MgPSAkKHRoaXMpLnByb3AoJ2NsYXNzJyk7XG5cdFx0XHRcdGNvbnN0IGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdmbGlwcGVkJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0J2FjdGl2ZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0JChcblx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsXG5cdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHQpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JChcblx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdGxldmVsX251bWJlciArXG5cdFx0XHRcdFx0XHQnICcgK1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvclxuXHRcdFx0XHQpLmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCEkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSkpIHtcblx0XHRcdFx0JC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4odGhpcywgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApO1xuIl19
}(jQuery));
