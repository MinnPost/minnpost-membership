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
        let annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10);
        // calculate member level formula
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
    };

  // The actual plugin constructor
  function Plugin(element, options) {
    this.element = element;

    // jQuery has an extend method which merges the contents of two or
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
      }

      // Set up the UI for the current field state on (re-)load
      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));
      if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
        return;
      }

      // Set up the UI for the current field state on (re-)load
      if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
        $(this.element).find(this.options.declineGiftLevel).prop('checked', false);
      }
      this.onDeclineBenefitsChange();
      this.giftOptionSelect();
      this.setRequiredFields($gifts);
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $gifts.on('click', this.onGiftsClick.bind(this));

      // because the next url is generated by WordPress based on what the JavaScript does,
      // we should also use the JavaScript to run a form submit when that link is clicked.
      const form = document.querySelector('.m-form-membership');
      const navForSubmit = document.querySelector('.a-pay-url');
      navForSubmit.addEventListener('click', function (event) {
        form.submit();
        event.preventDefault();
      });

      // when the form is submitted
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
      };
      // this tracks an event submission based on the plugin options
      // it also bubbles the event up to submit the form
      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      const hasClass = event.target.classList.contains('m-form-membership-support');
      // if this is the main checkout form, send it to the ec plugin as a checkout
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
      const settings = minnpost_membership_settings;
      // reset the message for current status
      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      }
      // set button to processing
      $button.text('Processing').addClass('a-button-disabled');

      // disable all the other buttons
      $('.a-benefit-button').addClass('a-button-disabled');

      // set ajax data
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
            }
            // re-enable all the other buttons
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
    this.element = element;

    // jQuery has an extend method which merges the contents of two or
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsInllYXJseUFtb3VudCIsIm5hbWUiLCJudW1iZXIiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwiJCIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwibGV2ZWxWaWV3ZXIiLCJsZXZlbE5hbWUiLCJ1c2VyQ3VycmVudExldmVsIiwiZGVjbGluZUJlbmVmaXRzIiwiZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZ2lmdExldmVsIiwiZ2lmdFNlbGVjdG9yIiwiZ2lmdE9wdGlvblNlbGVjdG9yIiwiZ2lmdExhYmVsIiwic3dhZ0VsaWdpYmlsaXR5VGV4dCIsInN3YWdTZWxlY3RvciIsInN3YWdMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZUdpZnRMZXZlbCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkZm9ybSIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRnaWZ0cyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJnaWZ0T3B0aW9uU2VsZWN0Iiwic2V0UmVxdWlyZWRGaWVsZHMiLCJvbkdpZnRzQ2xpY2siLCJmb3JtIiwicXVlcnlTZWxlY3RvciIsIm5hdkZvclN1Ym1pdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsInN1Ym1pdCIsInByZXZlbnREZWZhdWx0IiwicXVlcnlTZWxlY3RvckFsbCIsImZvckVhY2giLCJtZW1iZXJzaGlwRm9ybSIsIm9uRm9ybVN1Ym1pdCIsImFuYWx5dGljc1Byb2R1Y3RBY3Rpb24iLCJmcmVxdWVuY3lfbGFiZWwiLCJhY3Rpb24iLCJzdGVwIiwicHJvZHVjdCIsImFuYWx5dGljc1Byb2R1Y3QiLCJ3cCIsImhvb2tzIiwiZG9BY3Rpb24iLCJpZCIsInRvTG93ZXJDYXNlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImNhdGVnb3J5IiwiYnJhbmQiLCJ2YXJpYW50IiwicHJpY2UiLCJxdWFudGl0eSIsInRhcmdldCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCIkdGFyZ2V0IiwiJGdpZnRTZWxlY3Rpb25Hcm91cCIsImRlY2xpbmUiLCJoaWRlIiwic2hvdyIsInBhcmVudCIsImNoYW5nZSIsInNlbGVjdGVkT3B0aW9uIiwiY2hpbGRyZW4iLCIkZGVjbGluZSIsIiRjaGVja2VkR2lmdHMiLCJlYWNoIiwic2V0UmVxdWlyZWQiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInRleHQiLCJsYWJlbCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJoYXNDbGFzcyIsImNsYXNzTGlzdCIsImNvbnRhaW5zIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsIiRlbGVtZW50cyIsInVwZGF0ZWQiLCJzaG93TmV3TGV2ZWwiLCJzZXRFbmFibGVkR2lmdHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxWaWV3ZXJDb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwicmVwbGFjZSIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInNldEVuYWJsZWQiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZSIsImN1cnJlbnRfdXJsIiwiaW5zdGFuY2VfaWQiLCJwb3N0X2lkIiwiaXNfYWpheCIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJ2YWx1ZSIsInN2ZyIsImF0dHJpYnV0ZSIsImdldEF0dHJpYnV0ZSIsInRleHRDb250ZW50IiwidW5kZWZpbmVkIiwiZGVidWciLCJhbW91bnRfdmlld2VyIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZSIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwid3JhcEFsbCIsImNsb3Nlc3QiLCJjaGFuZ2VGcmVxdWVuY3kiLCJjaGFuZ2VBbW91bnRQcmV2aWV3Iiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQSxDQUFDLFVBQVVBLE1BQU0sRUFBRTtFQUNsQixTQUFTQyxrQkFBa0IsQ0FBQ0MsSUFBSSxFQUFFQyxRQUFRLEVBQUU7SUFDM0MsSUFBSSxDQUFDRCxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2QsSUFBSSxPQUFPQSxJQUFJLEtBQUssV0FBVyxFQUFFO01BQ2hDLElBQUksQ0FBQ0EsSUFBSSxHQUFHQSxJQUFJO0lBQ2pCO0lBRUEsSUFBSSxDQUFDQyxRQUFR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QUN0QyxDQUFDakUsUUFBUSxDQUFDLFNBQVMsQ0FBQztNQUN0QixDQUFDLENBQUM7SUFDSCxDQUFDLENBQUU7RUFDSixDQUFDLENBQUMsQ0FBQzs7RUFFSDtFQUNBO0VBQ0F4SCxDQUFDLENBQUM0SSxFQUFFLENBQUMxSSxVQUFVLENBQUMsR0FBRyxVQUFVMEIsT0FBTyxFQUFFO0lBQ3JDLE9BQU8sSUFBSSxDQUFDeUUsSUFBSSxDQUFDLFlBQVk7TUFDNUIsSUFBSSxDQUFDckcsQ0FBQyxDQUFDMUIsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEdBQUc0QixVQUFVLENBQUMsRUFBRTtRQUMxQ0YsQ0FBQyxDQUFDMUIsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLEdBQUc0QixVQUFVLEVBQUUsSUFBSXdCLE1BQU0sQ0FBQyxJQUFJLEVBQUVFLE9BQU8sQ0FBQyxDQUFDO01BQ2hFO0lBQ0QsQ0FBQyxDQUFDO0VBQ0gsQ0FBQztBQUNGLENBQUMsRUFBRWlILE1BQU0sRUFBRXpLLE1BQU0sRUFBRTZCLFFBQVEsRUFBRTVCLGtCQUFrQixDQUFDIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICh3aW5kb3cpIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKGRhdGEsIHNldHRpbmdzKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKFxuXHRcdFx0dHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0XHR0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnXG5cdFx0KSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsKGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlKSB7XG5cdFx0XHRsZXQgdGhpc3llYXIgPSBwYXJzZUludChhbW91bnQpICogcGFyc2VJbnQoZnJlcXVlbmN5KTtcblx0XHRcdGlmIChcblx0XHRcdFx0dHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnXG5cdFx0XHQpIHtcblx0XHRcdFx0bGV0IHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLFxuXHRcdFx0XHRcdDEwXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGxldCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KFxuXHRcdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICh0eXBlID09PSAnb25lLXRpbWUnKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KFxuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50LFxuXHRcdFx0XHRcdGNvbWluZ195ZWFyX2Ftb3VudCxcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCh0aGlzeWVhcik7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsKHRoaXN5ZWFyKSB7XG5cdFx0XHRjb25zdCBsZXZlbCA9IHtcblx0XHRcdFx0eWVhcmx5QW1vdW50OiB0aGlzeWVhcixcblx0XHRcdH07XG5cdFx0XHRpZiAodGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAxO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsLm5hbWUgPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkod2luZG93KTtcbiIsIi8vIHBsdWdpblxuKGZ1bmN0aW9uICgkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdGNvbnN0IHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRcdGRlY2xpbmVCZW5lZml0czogJy5tLWRlY2xpbmUtYmVuZWZpdHMtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdFx0Z2lmdExldmVsOiAnLm0tZ2lmdC1sZXZlbCcsXG5cdFx0XHRnaWZ0U2VsZWN0b3I6ICcubS1naWZ0LWxldmVsIC5tLWZvcm0taXRlbSBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0Z2lmdE9wdGlvblNlbGVjdG9yOiAnLmEtZ2lmdC1vcHRpb24tc2VsZWN0Jyxcblx0XHRcdGdpZnRMYWJlbDogJy5tLWdpZnQtbGV2ZWwgLm0tZm9ybS1pdGVtIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRcdHN3YWdFbGlnaWJpbGl0eVRleHQ6XG5cdFx0XHRcdCcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLnN3YWctZWxpZ2liaWxpdHknLFxuXHRcdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdHN3YWdMYWJlbHM6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0XHRtaW5BbW91bnRzOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5taW4tYW1vdW50Jyxcblx0XHRcdGRlY2xpbmVHaWZ0TGV2ZWw6ICcubS1kZWNsaW5lLWxldmVsJyxcblx0XHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbihlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0KCkge1xuXHRcdFx0Y29uc3QgJGZyZXF1ZW5jeSA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3Jcblx0XHRcdCk7XG5cdFx0XHRjb25zdCAkZm9ybSA9ICQodGhpcy5lbGVtZW50KTtcblx0XHRcdGNvbnN0ICRzdWdnZXN0ZWRBbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcik7XG5cdFx0XHRjb25zdCAkYW1vdW50ID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKTtcblx0XHRcdGNvbnN0ICRkZWNsaW5lQmVuZWZpdHMgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0c1xuXHRcdFx0KTtcblx0XHRcdGNvbnN0ICRnaWZ0cyA9ICQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0b3IpO1xuXHRcdFx0aWYgKFxuXHRcdFx0XHQhKFxuXHRcdFx0XHRcdCRhbW91bnQubGVuZ3RoID4gMCAmJlxuXHRcdFx0XHRcdCRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0XHRcdCRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMFxuXHRcdFx0XHQpXG5cdFx0XHQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cygkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoZmFsc2UpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5vbihcblx0XHRcdFx0J2NoYW5nZScsXG5cdFx0XHRcdHRoaXMub25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UuYmluZCh0aGlzKVxuXHRcdFx0KTtcblx0XHRcdCRhbW91bnQub24oJ2tleXVwIG1vdXNldXAnLCB0aGlzLm9uQW1vdW50Q2hhbmdlLmJpbmQodGhpcykpO1xuXG5cdFx0XHRpZiAoISgkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJGdpZnRzLmxlbmd0aCA+IDApKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoJGdpZnRzLm5vdCh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCkuaXMoJzpjaGVja2VkJykpIHtcblx0XHRcdFx0JCh0aGlzLmVsZW1lbnQpXG5cdFx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwpXG5cdFx0XHRcdFx0LnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblx0XHRcdHRoaXMuZ2lmdE9wdGlvblNlbGVjdCgpO1xuXHRcdFx0dGhpcy5zZXRSZXF1aXJlZEZpZWxkcygkZ2lmdHMpO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKFxuXHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKHRoaXMpXG5cdFx0XHQpO1xuXHRcdFx0JGdpZnRzLm9uKCdjbGljaycsIHRoaXMub25HaWZ0c0NsaWNrLmJpbmQodGhpcykpO1xuXG5cdFx0XHQvLyBiZWNhdXNlIHRoZSBuZXh0IHVybCBpcyBnZW5lcmF0ZWQgYnkgV29yZFByZXNzIGJhc2VkIG9uIHdoYXQgdGhlIEphdmFTY3JpcHQgZG9lcyxcblx0XHRcdC8vIHdlIHNob3VsZCBhbHNvIHVzZSB0aGUgSmF2YVNjcmlwdCB0byBydW4gYSBmb3JtIHN1Ym1pdCB3aGVuIHRoYXQgbGluayBpcyBjbGlja2VkLlxuXHRcdFx0Y29uc3QgZm9ybSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tLWZvcm0tbWVtYmVyc2hpcCcpO1xuXHRcdFx0Y29uc3QgbmF2Rm9yU3VibWl0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmEtcGF5LXVybCcpO1xuXHRcdFx0bmF2Rm9yU3VibWl0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdGZvcm0uc3VibWl0KCk7XG5cdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0Ly8gd2hlbiB0aGUgZm9ybSBpcyBzdWJtaXR0ZWRcblx0XHRcdGRvY3VtZW50XG5cdFx0XHRcdC5xdWVyeVNlbGVjdG9yQWxsKCcubS1mb3JtLW1lbWJlcnNoaXAnKVxuXHRcdFx0XHQuZm9yRWFjaCgobWVtYmVyc2hpcEZvcm0pID0+XG5cdFx0XHRcdFx0bWVtYmVyc2hpcEZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgKGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0XHR0aGlzLm9uRm9ybVN1Ym1pdChldmVudCk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0Lypcblx0XHQgKiBydW4gYW4gYW5hbHl0aWNzIHByb2R1Y3QgYWN0aW9uXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzUHJvZHVjdEFjdGlvbihsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsIGFjdGlvbiwgc3RlcCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChcblx0XHRcdFx0bGV2ZWwsXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5X2xhYmVsXG5cdFx0XHQpO1xuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLFxuXHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHRhY3Rpb24sXG5cdFx0XHRcdHByb2R1Y3QsXG5cdFx0XHRcdHN0ZXBcblx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc1Byb2R1Y3RBY3Rpb25cblxuXHRcdC8qXG5cdFx0ICogY3JlYXRlIGFuIGFuYWx5dGljcyBwcm9kdWN0IHZhcmlhYmxlXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzUHJvZHVjdChsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwpIHtcblx0XHRcdGNvbnN0IHByb2R1Y3QgPSB7XG5cdFx0XHRcdGlkOiAnbWlubnBvc3RfJyArIGxldmVsLnRvTG93ZXJDYXNlKCkgKyAnX21lbWJlcnNoaXAnLFxuXHRcdFx0XHRuYW1lOlxuXHRcdFx0XHRcdCdNaW5uUG9zdCAnICtcblx0XHRcdFx0XHRsZXZlbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArXG5cdFx0XHRcdFx0bGV2ZWwuc2xpY2UoMSkgK1xuXHRcdFx0XHRcdCcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdGNhdGVnb3J5OiAnRG9uYXRpb24nLFxuXHRcdFx0XHRicmFuZDogJ01pbm5Qb3N0Jyxcblx0XHRcdFx0dmFyaWFudDogZnJlcXVlbmN5X2xhYmVsLFxuXHRcdFx0XHRwcmljZTogYW1vdW50LFxuXHRcdFx0XHRxdWFudGl0eTogMSxcblx0XHRcdH07XG5cdFx0XHRyZXR1cm4gcHJvZHVjdDtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCQoZXZlbnQudGFyZ2V0KS52YWwoKSk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoJChldmVudC50YXJnZXQpLnZhbCgpKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCh0cnVlKTtcblx0XHR9LCAvLyBlbmQgb25GcmVxdWVuY3lDaGFuZ2VcblxuXHRcdG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlKGV2ZW50KSB7XG5cdFx0XHQkKHRoaXMuZWxlbWVudCkuZmluZCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpLnZhbChudWxsKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCh0cnVlKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlKGV2ZW50KSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoZXZlbnQpO1xuXG5cdFx0XHRjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpO1xuXHRcdFx0aWYgKCR0YXJnZXQuZGF0YSgnbGFzdC12YWx1ZScpICE9ICR0YXJnZXQudmFsKCkpIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCdsYXN0LXZhbHVlJywgJHRhcmdldC52YWwoKSk7XG5cdFx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCh0cnVlKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25BbW91bnRDaGFuZ2VcblxuXHRcdG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlKGV2ZW50KSB7XG5cdFx0XHRjb25zdCAkZ2lmdFNlbGVjdGlvbkdyb3VwID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0aW9uR3JvdXBcblx0XHRcdCk7XG5cdFx0XHRjb25zdCBkZWNsaW5lID0gJCh0aGlzLmVsZW1lbnQpXG5cdFx0XHRcdC5maW5kKHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMpXG5cdFx0XHRcdC5maWx0ZXIoJzpjaGVja2VkJylcblx0XHRcdFx0LnZhbCgpO1xuXG5cdFx0XHRpZiAoZGVjbGluZSA9PT0gJ3RydWUnKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0Z2lmdE9wdGlvblNlbGVjdCgpIHtcblx0XHRcdGNvbnN0IHBhcmVudCA9ICQodGhpcy5vcHRpb25zLmdpZnRPcHRpb25TZWxlY3Rvcilcblx0XHRcdFx0LnBhcmVudCgpXG5cdFx0XHRcdC5wYXJlbnQoKVxuXHRcdFx0XHQuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJyk7XG5cdFx0XHQkKHRoaXMub3B0aW9ucy5naWZ0T3B0aW9uU2VsZWN0b3IpLmNoYW5nZShmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IHNlbGVjdGVkT3B0aW9uID0gJCh0aGlzKVxuXHRcdFx0XHRcdC5jaGlsZHJlbignb3B0aW9uOnNlbGVjdGVkJylcblx0XHRcdFx0XHQudmFsKCk7XG5cdFx0XHRcdGlmICgnJyAhPT0gc2VsZWN0ZWRPcHRpb24pIHtcblx0XHRcdFx0XHRwYXJlbnQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgZ2lmdE9wdGlvblNlbGVjdFxuXG5cdFx0b25HaWZ0c0NsaWNrKGV2ZW50KSB7XG5cdFx0XHRjb25zdCAkZ2lmdHMgPSAkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rvcilcblx0XHRcdFx0Lm5vdCh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCk7XG5cdFx0XHRjb25zdCAkZGVjbGluZSA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbFxuXHRcdFx0KTtcblx0XHRcdGlmICgkKGV2ZW50LnRhcmdldCkuaXModGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwpKSB7XG5cdFx0XHRcdCRnaWZ0cy5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnNldFJlcXVpcmVkRmllbGRzKCRnaWZ0cyk7XG5cdFx0XHQkZGVjbGluZS5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdH0sIC8vIGVuZCBvbkdpZnRzQ2xpY2tcblxuXHRcdHNldFJlcXVpcmVkRmllbGRzKCRnaWZ0cykge1xuXHRcdFx0Y29uc3QgJGNoZWNrZWRHaWZ0cyA9ICRnaWZ0cy5maWx0ZXIoJzpjaGVja2VkJyk7XG5cdFx0XHRpZiAoJGNoZWNrZWRHaWZ0cykge1xuXHRcdFx0XHQkKFwiW2RhdGEtcmVxdWlyZWQ9J3RydWUnXVwiKS5wcm9wKCdyZXF1aXJlZCcsIGZhbHNlKTtcblx0XHRcdFx0JGNoZWNrZWRHaWZ0cy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRjb25zdCBzZXRSZXF1aXJlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdCQodGhpcykucHJvcCgncmVxdWlyZWQnLCB0cnVlKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdCQoXCJbZGF0YS1yZXF1aXJlZD0ndHJ1ZSddXCIsICQodGhpcykucGFyZW50KCkpLmVhY2goXG5cdFx0XHRcdFx0XHRzZXRSZXF1aXJlZFxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRSZXF1aXJlZEZpZWxkc1xuXG5cdFx0b25Gb3JtU3VibWl0KGV2ZW50KSB7XG5cdFx0XHRsZXQgYW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpXG5cdFx0XHRcdC5maWx0ZXIoJzpjaGVja2VkJylcblx0XHRcdFx0LnZhbCgpO1xuXHRcdFx0aWYgKHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKS52YWwoKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnZhbCgpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2lkID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS5wcm9wKCdpZCcpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2xhYmVsID0gJChcblx0XHRcdFx0J2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJ1xuXHRcdFx0KS50ZXh0KCk7XG5cdFx0XHRjb25zdCBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWVcblx0XHRcdCk7XG5cblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdHR5cGU6ICdldmVudCcsXG5cdFx0XHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0XHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0XHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZSxcblx0XHRcdH07XG5cdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0Ly8gaXQgYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgaGFzQ2xhc3MgPSBldmVudC50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKFxuXHRcdFx0XHQnbS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydCdcblx0XHRcdCk7XG5cdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBhcyBhIGNoZWNrb3V0XG5cdFx0XHRpZiAoaGFzQ2xhc3MpIHtcblx0XHRcdFx0Y29uc3QgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChcblx0XHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdFx0KTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdFx0J2V2ZW50Jyxcblx0XHRcdFx0XHQnYWRkX3RvX2NhcnQnLFxuXHRcdFx0XHRcdHByb2R1Y3Rcblx0XHRcdFx0KTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdFx0J2V2ZW50Jyxcblx0XHRcdFx0XHQnYmVnaW5fY2hlY2tvdXQnLFxuXHRcdFx0XHRcdHByb2R1Y3Rcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25Gb3JtU3VibWl0XG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yKGV2ZW50KSB7XG5cdFx0XHRjb25zdCAkc3VnZ2VzdGVkQW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpO1xuXG5cdFx0XHRpZiAoJChldmVudC50YXJnZXQpLnZhbCgpID09PSAnJykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHR9LCAvLyBlbmQgY2xlYXJBbW91bnRTZWxlY3RvclxuXG5cdFx0c2V0QW1vdW50TGFiZWxzKGZyZXF1ZW5jeVN0cmluZykge1xuXHRcdFx0Y29uc3QgJGdyb3VwcyA9ICQodGhpcy5vcHRpb25zLmFtb3VudEdyb3VwKTtcblx0XHRcdGNvbnN0ICRzZWxlY3RlZCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKS5maWx0ZXIoJzpjaGVja2VkJyk7XG5cdFx0XHRjb25zdCBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCdpbmRleCcpO1xuXHRcdFx0Y29uc3QgJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5jdXN0b21BbW91bnRGcmVxdWVuY3lcblx0XHRcdCk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0JGdyb3Vwc1xuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCgnY2hlY2tlZCcsIGZhbHNlKTtcblx0XHRcdCRncm91cHNcblx0XHRcdFx0LmZpbHRlcignLmFjdGl2ZScpXG5cdFx0XHRcdC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nKVxuXHRcdFx0XHQucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuXG5cdFx0XHRjb25zdCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgPSAkZ3JvdXBzXG5cdFx0XHRcdC5maWx0ZXIoJy5hY3RpdmUnKVxuXHRcdFx0XHQuZmluZCgnLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnKVxuXHRcdFx0XHQuZmlyc3QoKVxuXHRcdFx0XHQudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KGN1cnJlbnRGcmVxdWVuY3lMYWJlbCk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0c2V0TWluQW1vdW50cyhmcmVxdWVuY3lTdHJpbmcpIHtcblx0XHRcdGNvbnN0ICRlbGVtZW50cyA9ICQodGhpcy5vcHRpb25zLm1pbkFtb3VudHMpO1xuXHRcdFx0JGVsZW1lbnRzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdCRlbGVtZW50c1xuXHRcdFx0XHQuZmlsdGVyKCdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScpXG5cdFx0XHRcdC5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0fSwgLy8gZW5kIHNldE1pbkFtb3VudHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWwodXBkYXRlZCkge1xuXHRcdFx0bGV0IGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKVxuXHRcdFx0XHQuZmlsdGVyKCc6Y2hlY2tlZCcpXG5cdFx0XHRcdC52YWwoKTtcblx0XHRcdGlmICh0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnZhbCgpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2lkID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS5wcm9wKCdpZCcpO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X2xhYmVsID0gJChcblx0XHRcdFx0J2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJ1xuXHRcdFx0KS50ZXh0KCk7XG5cblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZVxuXHRcdFx0KTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCk7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWRHaWZ0cyhsZXZlbCk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc1Byb2R1Y3RBY3Rpb24oXG5cdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5X2xhYmVsLFxuXHRcdFx0XHQnc2VsZWN0X2NvbnRlbnQnLFxuXHRcdFx0XHQxXG5cdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBjaGVja0FuZFNldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWwoZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwpIHtcblx0XHRcdGxldCBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHRsZXQgb2xkX2xldmVsID0gJyc7XG5cdFx0XHRsZXQgbGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHRjb25zdCBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24gKHN0cikge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoLyYjKFxcZCspOy9nLCBmdW5jdGlvbiAobWF0Y2gsIGRlYykge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGRlYyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICh0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID1cblx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCQob3B0aW9ucy5sZXZlbFZpZXdlcikubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnByb3AoXG5cdFx0XHRcdFx0J2NsYXNzJyxcblx0XHRcdFx0XHQnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWwubmFtZS50b0xvd2VyQ2FzZSgpXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdCQob3B0aW9ucy51c2VyQ3VycmVudExldmVsKS5sZW5ndGggPiAwICYmXG5cdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID5cblx0XHRcdFx0XHRcdDBcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0aWYgKCgnYScsICQob3B0aW9ucy5sZXZlbFZpZXdlcikubGVuZ3RoID4gMCkpIHtcblx0XHRcdFx0XHRcdGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID1cblx0XHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoXG5cdFx0XHRcdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXgsXG5cdFx0XHRcdFx0XHRcdCcnXG5cdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0aWYgKG9sZF9sZXZlbCAhPT0gbGV2ZWwubmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cdFx0XHRcdFx0XHQkKGxldmVsVmlld2VyQ29udGFpbmVyKS5odG1sKFxuXHRcdFx0XHRcdFx0XHRkZWNvZGVIdG1sRW50aXR5KFxuXHRcdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikuZGF0YSgnY2hhbmdlZCcpXG5cdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQobGV2ZWxWaWV3ZXJDb250YWluZXIpLmh0bWwoXG5cdFx0XHRcdFx0XHRcdGRlY29kZUh0bWxFbnRpdHkoXG5cdFx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5kYXRhKCdub3QtY2hhbmdlZCcpXG5cdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsTmFtZSwgb3B0aW9ucy5sZXZlbFZpZXdlcikudGV4dChsZXZlbC5uYW1lKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRzZXRFbmFibGVkR2lmdHMobGV2ZWwpIHtcblx0XHRcdGNvbnN0IHNldEVuYWJsZWQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdCQodGhpcykucHJvcChcblx0XHRcdFx0XHQnZGlzYWJsZWQnLFxuXHRcdFx0XHRcdGxldmVsLnllYXJseUFtb3VudCA8ICQodGhpcykuZGF0YSgnbWluWWVhcmx5QW1vdW50Jylcblx0XHRcdFx0KTtcblx0XHRcdH07XG5cblx0XHRcdCQodGhpcy5vcHRpb25zLmdpZnRTZWxlY3RvcikuZWFjaChzZXRFbmFibGVkKTtcblxuXHRcdFx0aWYgKFxuXHRcdFx0XHQkKHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IpLm5vdCgnI3N3YWctZGVjbGluZScpLmlzKCc6ZW5hYmxlZCcpXG5cdFx0XHQpIHtcblx0XHRcdFx0JCgnLnN3YWctZGlzYWJsZWQnKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdCQoJy5zd2FnLWVuYWJsZWQnKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCcuc3dhZy1kaXNhYmxlZCcpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JCgnLnN3YWctZW5hYmxlZCcpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCEkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSkpIHtcblx0XHRcdFx0JC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4odGhpcywgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApO1xuIiwiKGZ1bmN0aW9uICgkKSB7XG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICgyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUpIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCh0cnVlKTtcblx0XHR9XG5cdFx0JCgnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnKS5yZW1vdmVBdHRyKCdkaXNhYmxlZCcpO1xuXHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJykuY2xpY2soZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG5cdFx0XHRjb25zdCAkc3RhdHVzID0gJCgnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCh0aGlzKS5wYXJlbnQoKSk7XG5cdFx0XHRjb25zdCAkc2VsZWN0ID0gJCgnc2VsZWN0JywgJCh0aGlzKS5wYXJlbnQoKSk7XG5cdFx0XHRjb25zdCBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICghJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJykge1xuXHRcdFx0XHQkKCcubS1iZW5lZml0LW1lc3NhZ2UnKS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHQnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJ1xuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoJ1Byb2Nlc3NpbmcnKS5hZGRDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJykuYWRkQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJyk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdGxldCBkYXRhID0ge307XG5cdFx0XHRjb25zdCBiZW5lZml0VHlwZSA9ICQoJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKTtcblx0XHRcdGlmICgncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdGFjdGlvbjogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlOlxuXHRcdFx0XHRcdFx0JGJ1dHRvbi5kYXRhKCdiZW5lZml0LW5vbmNlJyksXG5cdFx0XHRcdFx0Y3VycmVudF91cmw6ICQoJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0aW5zdGFuY2VfaWQ6ICQoXG5cdFx0XHRcdFx0XHQnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nXG5cdFx0XHRcdFx0KS52YWwoKSxcblx0XHRcdFx0XHRwb3N0X2lkOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdGlzX2FqYXg6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3Qoc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICh0cnVlID09PSByZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0LnZhbChyZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSlcblx0XHRcdFx0XHRcdFx0LnRleHQocmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpXG5cdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MocmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MpXG5cdFx0XHRcdFx0XHRcdC5wcm9wKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUpO1xuXHRcdFx0XHRcdFx0JHN0YXR1c1xuXHRcdFx0XHRcdFx0XHQuaHRtbChyZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhcblx0XHRcdFx0XHRcdFx0XHQnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICtcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0aWYgKDAgPCAkc2VsZWN0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbicpXG5cdFx0XHRcdFx0XHRcdC5ub3QoJGJ1dHRvbilcblx0XHRcdFx0XHRcdFx0LnZhbChyZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSlcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdFx0J3VuZGVmaW5lZCcgPT09XG5cdFx0XHRcdFx0XHRcdHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZVxuXHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdGlmICgnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnRleHQocmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpXG5cdFx0XHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJylcblx0XHRcdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0XHRcdC5wcm9wKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkKCdvcHRpb24nLCAkc2VsZWN0KS5lYWNoKGZ1bmN0aW9uIChpKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdFx0XHRcdFx0JCh0aGlzKS52YWwoKSA9PT1cblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlXG5cdFx0XHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICgnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnRleHQocmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwpXG5cdFx0XHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJylcblx0XHRcdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0XHRcdC5wcm9wKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbicpXG5cdFx0XHRcdFx0XHRcdC5ub3QoJGJ1dHRvbilcblx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0JHN0YXR1c1xuXHRcdFx0XHRcdFx0XHQuaHRtbChyZXNwb25zZS5kYXRhLm1lc3NhZ2UpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhcblx0XHRcdFx0XHRcdFx0XHQnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICtcblx0XHRcdFx0XHRcdFx0XHRcdHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKDAgPCAkKCcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcpLmxlbmd0aCkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdFx0JCgnLmEtcmVmcmVzaC1wYWdlJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSk7XG5cdH0pO1xufSkoalF1ZXJ5KTtcbiIsImNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicpO1xuaWYgKGJ1dHRvbikge1xuXHRidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRsZXQgdmFsdWUgPSAnJztcblx0XHRjb25zdCBzdmcgPSBidXR0b24ucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG5cdFx0aWYgKG51bGwgIT09IHN2Zykge1xuXHRcdFx0Y29uc3QgYXR0cmlidXRlID0gc3ZnLmdldEF0dHJpYnV0ZSgndGl0bGUnKTtcblx0XHRcdGlmIChudWxsICE9PSBhdHRyaWJ1dGUpIHtcblx0XHRcdFx0dmFsdWUgPSBhdHRyaWJ1dGUgKyAnICc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhbHVlID0gdmFsdWUgKyBidXR0b24udGV4dENvbnRlbnQ7XG5cdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0J2V2ZW50Jyxcblx0XHRcdCdTdXBwb3J0IENUQSAtIEhlYWRlcicsXG5cdFx0XHQnQ2xpY2s6ICcgKyB2YWx1ZSxcblx0XHRcdGxvY2F0aW9uLnBhdGhuYW1lXG5cdFx0KTtcblx0fSk7XG59XG4iLCIvLyBwbHVnaW5cbihmdW5jdGlvbiAoJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQpIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdGNvbnN0IHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGRlYnVnOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0XHRhbW91bnRfdmlld2VyOiAnLmFtb3VudCBoMycsXG5cdFx0XHRmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHRcdGZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZTogJ3NlbGVjdCcsXG5cdFx0XHRsZXZlbHNfY29udGFpbmVyOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHRcdHNpbmdsZV9sZXZlbF9jb250YWluZXI6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0XHRzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcjogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0XHRmbGlwcGVkX2l0ZW1zOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHRcdGxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHRcdGNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0XHRhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdFx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQocmVzZXQsIGFtb3VudCkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3ModGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2sodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rcyhlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiZcblx0XHRcdFx0XHRsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywgJycpID09XG5cdFx0XHRcdFx0XHR0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgJiZcblx0XHRcdFx0XHRsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lXG5cdFx0XHRcdCkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aFxuXHRcdFx0XHRcdFx0PyB0YXJnZXRcblx0XHRcdFx0XHRcdDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArICddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3AsXG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdDEwMDBcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IHRoYXQgPSB0aGlzO1xuXHRcdFx0bGV0IGFtb3VudCA9IDA7XG5cdFx0XHRsZXQgbGV2ZWwgPSAnJztcblx0XHRcdGxldCBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdGxldCBmcmVxdWVuY3kgPSAnJztcblx0XHRcdGxldCBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoJChvcHRpb25zLmxldmVsc19jb250YWluZXIpLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5lYWNoKFxuXHRcdFx0XHRcdGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpKS53cmFwQWxsKFxuXHRcdFx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+J1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50KS5vbihcblx0XHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0XHRmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lcixcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHRcdCkucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHRcdFx0XHQkKGV2ZW50LnRhcmdldClcblx0XHRcdFx0XHRcdFx0XHQuY2xvc2VzdChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKVxuXHRcdFx0XHRcdFx0XHRcdC5hZGRDbGFzcygnZmxpcHBlZCcpO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChmcmVxdWVuY3kgPT0gMSkge1xuXHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0KS52YWwoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF92aWV3ZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdkZWZhdWx0LXllYXJseScpXG5cdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3kgPT0gMTIpIHtcblx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdCkudmFsKFxuXHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfdmlld2VyLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnLScgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHRcdCkuZGF0YSgnZGVmYXVsdC1tb250aGx5Jylcblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgK1xuXHRcdFx0XHRcdFx0XHRcdFx0J1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICtcblx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciArXG5cdFx0XHRcdFx0XHRcdFx0XHQnXCJdJ1xuXHRcdFx0XHRcdFx0XHQpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKFxuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KFxuXHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcsXG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoXG5cdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcikubGVuZ3RoID4gMFxuXHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHRcdCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0JCh0aGlzKVxuXHRcdFx0XHRcdFx0XHRcdCkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRcdGlmICh0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJChcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoXG5cdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcsXG5cdFx0XHRcdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCQob3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscykubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQpLmNsaWNrKFxuXHRcdFx0XHRcdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHRlbGVtZW50XG5cdFx0XHRcdFx0XHQpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdCkucmVtb3ZlQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHRcdFx0J2FjdGl2ZSdcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHQkKGV2ZW50LnRhcmdldClcblx0XHRcdFx0XHRcdFx0LmNsb3Nlc3Qob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcilcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLFxuXHRcdFx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpXG5cdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgK1xuXHRcdFx0XHRcdFx0XHRcdCdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArXG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyICtcblx0XHRcdFx0XHRcdFx0XHQnXCJdJ1xuXHRcdFx0XHRcdFx0KS52YWwoKTtcblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKFxuXHRcdFx0XHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsKGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHRjb25zdCBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0dHlwZVxuXHRcdFx0KTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKCQodGhpcykudGV4dCgpID09IGxldmVsLm5hbWUpIHtcblx0XHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0XHQnYWN0aXZlJ1xuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeShzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGxldCByYW5nZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG1vbnRoX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J21vbnRoJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCB5ZWFyX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J3llYXInXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IG9uY2VfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnb25lLXRpbWUnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBwYXJzZUludChzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0pO1xuXG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzKS52YWwoc2VsZWN0ZWQpO1xuXHRcdFx0XHQkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscykucHJvcChcblx0XHRcdFx0XHQnc2VsZWN0ZWQnLFxuXHRcdFx0XHRcdHNlbGVjdGVkXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0aWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkucmVtb3ZlQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dChyYW5nZSk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdmcmVxdWVuY3knLFxuXHRcdFx0XHRcdGZyZXF1ZW5jeVxuXHRcdFx0XHQpO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldyhzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGxldCByYW5nZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG1vbnRoX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J21vbnRoJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRjb25zdCB5ZWFyX3ZhbHVlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J3llYXInXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IG9uY2VfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnb25lLXRpbWUnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJykge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnJlbW92ZUNsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJykge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQocmFuZ2UpO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljayhlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGNvbnN0IGxldmVsX2NsYXNzID0gJCh0aGlzKS5wcm9wKCdjbGFzcycpO1xuXHRcdFx0XHRjb25zdCBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLSAxXTtcblx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHQnZmxpcHBlZCdcblx0XHRcdFx0KTtcblx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdhY3RpdmUnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdCQoXG5cdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLFxuXHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0KS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdCQoXG5cdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgK1xuXHRcdFx0XHRcdFx0JyAnICtcblx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3Jcblx0XHRcdFx0KS5hZGRDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICghJC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUpKSB7XG5cdFx0XHRcdCQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKHRoaXMsIG9wdGlvbnMpKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwKTtcbiJdfQ==
}(jQuery));
