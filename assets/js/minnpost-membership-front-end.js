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

    /**
     * Run a dataLayer product action
     *
     * @param  level
     * @param  amount
     * @param  frequency_label
     * @param  action
     */
    dataLayerProductAction(level, amount, frequency_label, action) {
      if (typeof wp !== 'undefined') {
        const product = this.analyticsProduct(level, amount, frequency_label);
        const dataLayerContent = {
          action,
          product
        };
        wp.hooks.doAction('minnpostMembershipDataLayerEcommerceAction', dataLayerContent);
      }
    },
    // end dataLayerProductAction

    /*
     * run an analytics cart action
     */
    analyticsCartAction(level, amount, frequency_label) {
      const product = this.analyticsProduct(level.name, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
    },
    // end analyticsCartAction

    /*
     * run an dataLayer cart action
     */
    dataLayerCartAction(level, amount, frequency_label) {
      const product = this.analyticsProduct(level.name, amount, frequency_label);
      const dataLayerAddToCart = {
        action: 'add_to_cart',
        product
      };
      wp.hooks.doAction('minnpostMembershipDataLayerEcommerceAction', dataLayerAddToCart);
      const dataLayerBeginCheckout = {
        action: 'begin_checkout',
        product
      };
      wp.hooks.doAction('minnpostMembershipDataLayerEcommerceAction', dataLayerBeginCheckout);
    },
    // end dataLayerCartAction

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
      // gtm can detect the form submission itself.
      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      const hasClass = event.target.classList.contains('m-form-membership-support');
      // if this is the main checkout form, send it to the ec plugin or gtm as a checkout
      if (hasClass) {
        this.analyticsCartAction(level, amount, frequency_label);
        this.dataLayerCartAction(level, amount, frequency_label);
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
      this.dataLayerProductAction(level.name, amount, frequency_label, 'select_item');
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
    if ('back_forward' === performance.getEntriesByType('navigation')[0].type) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsInllYXJseUFtb3VudCIsIm5hbWUiLCJudW1iZXIiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwiJCIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwibGV2ZWxWaWV3ZXIiLCJsZXZlbE5hbWUiLCJ1c2VyQ3VycmVudExldmVsIiwiZGVjbGluZUJlbmVmaXRzIiwiZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZ2lmdExldmVsIiwiZ2lmdFNlbGVjdG9yIiwiZ2lmdE9wdGlvblNlbGVjdG9yIiwiZ2lmdExhYmVsIiwic3dhZ0VsaWdpYmlsaXR5VGV4dCIsInN3YWdTZWxlY3RvciIsInN3YWdMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZUdpZnRMZXZlbCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkZm9ybSIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRnaWZ0cyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJnaWZ0T3B0aW9uU2VsZWN0Iiwic2V0UmVxdWlyZWRGaWVsZHMiLCJvbkdpZnRzQ2xpY2siLCJmb3JtIiwicXVlcnlTZWxlY3RvciIsIm5hdkZvclN1Ym1pdCIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsInN1Ym1pdCIsInByZXZlbnREZWZhdWx0IiwicXVlcnlTZWxlY3RvckFsbCIsImZvckVhY2giLCJtZW1iZXJzaGlwRm9ybSIsIm9uRm9ybVN1Ym1pdCIsImFuYWx5dGljc1Byb2R1Y3RBY3Rpb24iLCJmcmVxdWVuY3lfbGFiZWwiLCJhY3Rpb24iLCJzdGVwIiwicHJvZHVjdCIsImFuYWx5dGljc1Byb2R1Y3QiLCJ3cCIsImhvb2tzIiwiZG9BY3Rpb24iLCJkYXRhTGF5ZXJQcm9kdWN0QWN0aW9uIiwiZGF0YUxheWVyQ29udGVudCIsImFuYWx5dGljc0NhcnRBY3Rpb24iLCJkYXRhTGF5ZXJDYXJ0QWN0aW9uIiwiZGF0YUxheWVyQWRkVG9DYXJ0IiwiZGF0YUxheWVyQmVnaW5DaGVja291dCIsImlkIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwiY2F0ZWdvcnkiLCJicmFuZCIsInZhcmlhbnQiLCJwcmljZSIsInF1YW50aXR5IiwidGFyZ2V0IiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwicGFyZW50IiwiY2hhbmdlIiwic2VsZWN0ZWRPcHRpb24iLCJjaGlsZHJlbiIsIiRkZWNsaW5lIiwiJGNoZWNrZWRHaWZ0cyIsImVhY2giLCJzZXRSZXF1aXJlZCIsImZyZXF1ZW5jeV9zdHJpbmciLCJzcGxpdCIsImZyZXF1ZW5jeV9uYW1lIiwiZnJlcXVlbmN5X2lkIiwidGV4dCIsImxhYmVsIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhhc0NsYXNzIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCIkY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImN1cnJlbnRGcmVxdWVuY3lMYWJlbCIsImZpcnN0IiwiJGVsZW1lbnRzIiwidXBkYXRlZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsImZuIiwialF1ZXJ5IiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsImdldEVudHJpZXNCeVR5cGUiLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCIkYnV0dG9uIiwiJHN0YXR1cyIsIiRzZWxlY3QiLCJiZW5lZml0VHlwZSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlIiwiY3VycmVudF91cmwiLCJpbnN0YW5jZV9pZCIsInBvc3RfaWQiLCJpc19hamF4IiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsImJ1dHRvbiIsInZhbHVlIiwic3ZnIiwiYXR0cmlidXRlIiwiZ2V0QXR0cmlidXRlIiwidGV4dENvbnRlbnQiLCJ1bmRlZmluZWQiLCJkZWJ1ZyIsImFtb3VudF92aWV3ZXIiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwiaG9zdG5hbWUiLCJoYXNoIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJsZXZlbF9udW1iZXIiLCJ3cmFwQWxsIiwiY2xvc2VzdCIsImNoYW5nZUZyZXF1ZW5jeSIsImNoYW5nZUFtb3VudFByZXZpZXciLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsVUFBVUEsTUFBTSxFQUFFO0VBQ2xCLFNBQVNDLGtCQUFrQixDQUFDQyxJQUFJLEVBQUVDLFFB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ZW50IjpbIihmdW5jdGlvbiAod2luZG93KSB7XG5cdGZ1bmN0aW9uIE1pbm5Qb3N0TWVtYmVyc2hpcChkYXRhLCBzZXR0aW5ncykge1xuXHRcdHRoaXMuZGF0YSA9IHt9O1xuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9ICcnO1xuXHRcdGlmIChcblx0XHRcdHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdFx0dHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJ1xuXHRcdCkge1xuXHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9IHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdH1cblx0fVxuXG5cdE1pbm5Qb3N0TWVtYmVyc2hpcC5wcm90b3R5cGUgPSB7XG5cdFx0Y2hlY2tMZXZlbChhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSkge1xuXHRcdFx0bGV0IHRoaXN5ZWFyID0gcGFyc2VJbnQoYW1vdW50KSAqIHBhcnNlSW50KGZyZXF1ZW5jeSk7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdHR5cGVvZiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAnJ1xuXHRcdFx0KSB7XG5cdFx0XHRcdGxldCBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KFxuXHRcdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zLFxuXHRcdFx0XHRcdDEwXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KFxuXHRcdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyxcblx0XHRcdFx0XHQxMFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRsZXQgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludChcblx0XHRcdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50LFxuXHRcdFx0XHRcdDEwXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAodHlwZSA9PT0gJ29uZS10aW1lJykge1xuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpc3llYXIgPSBNYXRoLm1heChcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCxcblx0XHRcdFx0XHRjb21pbmdfeWVhcl9hbW91bnQsXG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnRcblx0XHRcdFx0KTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGV2ZWwodGhpc3llYXIpO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbCh0aGlzeWVhcikge1xuXHRcdFx0Y29uc3QgbGV2ZWwgPSB7XG5cdFx0XHRcdHllYXJseUFtb3VudDogdGhpc3llYXIsXG5cdFx0XHR9O1xuXHRcdFx0aWYgKHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwKSB7XG5cdFx0XHRcdGxldmVsLm5hbWUgPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMTtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbC5uYW1lID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsLm5hbWUgPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsLm5hbWUgPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXHR9O1xuXG5cdHdpbmRvdy5NaW5uUG9zdE1lbWJlcnNoaXAgPSBuZXcgTWlublBvc3RNZW1iZXJzaGlwKFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEsXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3Ncblx0KTtcbn0pKHdpbmRvdyk7XG4iLCIvLyBwbHVnaW5cbihmdW5jdGlvbiAoJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHRjb25zdCBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0XHRkZWZhdWx0cyA9IHtcblx0XHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRcdGFtb3VudEZpZWxkOiAnLmEtYW1vdW50LWZpZWxkICNhbW91bnQnLFxuXHRcdFx0Y3VzdG9tQW1vdW50RnJlcXVlbmN5OiAnI2Ftb3VudC1pdGVtIC5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJyxcblx0XHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0XHRsZXZlbE5hbWU6ICcuYS1sZXZlbCcsXG5cdFx0XHR1c2VyQ3VycmVudExldmVsOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0Z2lmdFNlbGVjdGlvbkdyb3VwOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yJyxcblx0XHRcdGdpZnRMZXZlbDogJy5tLWdpZnQtbGV2ZWwnLFxuXHRcdFx0Z2lmdFNlbGVjdG9yOiAnLm0tZ2lmdC1sZXZlbCAubS1mb3JtLWl0ZW0gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGdpZnRPcHRpb25TZWxlY3RvcjogJy5hLWdpZnQtb3B0aW9uLXNlbGVjdCcsXG5cdFx0XHRnaWZ0TGFiZWw6ICcubS1naWZ0LWxldmVsIC5tLWZvcm0taXRlbSBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0XHRzd2FnRWxpZ2liaWxpdHlUZXh0OlxuXHRcdFx0XHQnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5zd2FnLWVsaWdpYmlsaXR5Jyxcblx0XHRcdHN3YWdTZWxlY3RvcjogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRzd2FnTGFiZWxzOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdFx0bWluQW1vdW50czogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAubWluLWFtb3VudCcsXG5cdFx0XHRkZWNsaW5lR2lmdExldmVsOiAnLm0tZGVjbGluZS1sZXZlbCcsXG5cdFx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdCgpIHtcblx0XHRcdGNvbnN0ICRmcmVxdWVuY3kgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yXG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgJGZvcm0gPSAkKHRoaXMuZWxlbWVudCk7XG5cdFx0XHRjb25zdCAkc3VnZ2VzdGVkQW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpO1xuXHRcdFx0Y29uc3QgJGFtb3VudCA9ICQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCk7XG5cdFx0XHRjb25zdCAkZGVjbGluZUJlbmVmaXRzID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHNcblx0XHRcdCk7XG5cdFx0XHRjb25zdCAkZ2lmdHMgPSAkKHRoaXMuZWxlbWVudCkuZmluZCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKTtcblx0XHRcdGlmIChcblx0XHRcdFx0IShcblx0XHRcdFx0XHQkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdFx0XHQkZnJlcXVlbmN5Lmxlbmd0aCA+IDAgJiZcblx0XHRcdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDBcblx0XHRcdFx0KVxuXHRcdFx0KSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscygkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKGZhbHNlKTtcblxuXHRcdFx0JGZyZXF1ZW5jeS5vbignY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpKTtcblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQub24oXG5cdFx0XHRcdCdjaGFuZ2UnLFxuXHRcdFx0XHR0aGlzLm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlLmJpbmQodGhpcylcblx0XHRcdCk7XG5cdFx0XHQkYW1vdW50Lm9uKCdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKHRoaXMpKTtcblxuXHRcdFx0aWYgKCEoJGRlY2xpbmVCZW5lZml0cy5sZW5ndGggPiAwICYmICRnaWZ0cy5sZW5ndGggPiAwKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCRnaWZ0cy5ub3QodGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwpLmlzKCc6Y2hlY2tlZCcpKSB7XG5cdFx0XHRcdCQodGhpcy5lbGVtZW50KVxuXHRcdFx0XHRcdC5maW5kKHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKVxuXHRcdFx0XHRcdC5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlKCk7XG5cdFx0XHR0aGlzLmdpZnRPcHRpb25TZWxlY3QoKTtcblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbihcblx0XHRcdFx0J2NoYW5nZScsXG5cdFx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCh0aGlzKVxuXHRcdFx0KTtcblx0XHRcdCRnaWZ0cy5vbignY2xpY2snLCB0aGlzLm9uR2lmdHNDbGljay5iaW5kKHRoaXMpKTtcblxuXHRcdFx0Ly8gYmVjYXVzZSB0aGUgbmV4dCB1cmwgaXMgZ2VuZXJhdGVkIGJ5IFdvcmRQcmVzcyBiYXNlZCBvbiB3aGF0IHRoZSBKYXZhU2NyaXB0IGRvZXMsXG5cdFx0XHQvLyB3ZSBzaG91bGQgYWxzbyB1c2UgdGhlIEphdmFTY3JpcHQgdG8gcnVuIGEgZm9ybSBzdWJtaXQgd2hlbiB0aGF0IGxpbmsgaXMgY2xpY2tlZC5cblx0XHRcdGNvbnN0IGZvcm0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubS1mb3JtLW1lbWJlcnNoaXAnKTtcblx0XHRcdGNvbnN0IG5hdkZvclN1Ym1pdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hLXBheS11cmwnKTtcblx0XHRcdG5hdkZvclN1Ym1pdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRmb3JtLnN1Ym1pdCgpO1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vIHdoZW4gdGhlIGZvcm0gaXMgc3VibWl0dGVkXG5cdFx0XHRkb2N1bWVudFxuXHRcdFx0XHQucXVlcnlTZWxlY3RvckFsbCgnLm0tZm9ybS1tZW1iZXJzaGlwJylcblx0XHRcdFx0LmZvckVhY2goKG1lbWJlcnNoaXBGb3JtKSA9PlxuXHRcdFx0XHRcdG1lbWJlcnNoaXBGb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5vbkZvcm1TdWJtaXQoZXZlbnQpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGluaXRcblxuXHRcdC8qXG5cdFx0ICogcnVuIGFuIGFuYWx5dGljcyBwcm9kdWN0IGFjdGlvblxuXHRcdCAqL1xuXHRcdGFuYWx5dGljc1Byb2R1Y3RBY3Rpb24obGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsLCBhY3Rpb24sIHN0ZXApIHtcblx0XHRcdGNvbnN0IHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QoXG5cdFx0XHRcdGxldmVsLFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeV9sYWJlbFxuXHRcdFx0KTtcblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0J2V2ZW50Jyxcblx0XHRcdFx0YWN0aW9uLFxuXHRcdFx0XHRwcm9kdWN0LFxuXHRcdFx0XHRzdGVwXG5cdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0QWN0aW9uXG5cblx0XHQvKipcblx0XHQgKiBSdW4gYSBkYXRhTGF5ZXIgcHJvZHVjdCBhY3Rpb25cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSAgbGV2ZWxcblx0XHQgKiBAcGFyYW0gIGFtb3VudFxuXHRcdCAqIEBwYXJhbSAgZnJlcXVlbmN5X2xhYmVsXG5cdFx0ICogQHBhcmFtICBhY3Rpb25cblx0XHQgKi9cblx0XHRkYXRhTGF5ZXJQcm9kdWN0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uKSB7XG5cdFx0XHRpZiAodHlwZW9mIHdwICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRcdGxldmVsLFxuXHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZGF0YUxheWVyQ29udGVudCA9IHtcblx0XHRcdFx0XHRhY3Rpb24sXG5cdFx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdFx0fTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcERhdGFMYXllckVjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdFx0ZGF0YUxheWVyQ29udGVudFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBkYXRhTGF5ZXJQcm9kdWN0QWN0aW9uXG5cblx0XHQvKlxuXHRcdCAqIHJ1biBhbiBhbmFseXRpY3MgY2FydCBhY3Rpb25cblx0XHQgKi9cblx0XHRhbmFseXRpY3NDYXJ0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChcblx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdCk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdCdldmVudCcsXG5cdFx0XHRcdCdhZGRfdG9fY2FydCcsXG5cdFx0XHRcdHByb2R1Y3Rcblx0XHRcdCk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdCdldmVudCcsXG5cdFx0XHRcdCdiZWdpbl9jaGVja291dCcsXG5cdFx0XHRcdHByb2R1Y3Rcblx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0NhcnRBY3Rpb25cblxuXHRcdC8qXG5cdFx0ICogcnVuIGFuIGRhdGFMYXllciBjYXJ0IGFjdGlvblxuXHRcdCAqL1xuXHRcdGRhdGFMYXllckNhcnRBY3Rpb24obGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsKSB7XG5cdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeV9sYWJlbFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGRhdGFMYXllckFkZFRvQ2FydCA9IHtcblx0XHRcdFx0YWN0aW9uOiAnYWRkX3RvX2NhcnQnLFxuXHRcdFx0XHRwcm9kdWN0LFxuXHRcdFx0fTtcblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwRGF0YUxheWVyRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0ZGF0YUxheWVyQWRkVG9DYXJ0XG5cdFx0XHQpO1xuXHRcdFx0Y29uc3QgZGF0YUxheWVyQmVnaW5DaGVja291dCA9IHtcblx0XHRcdFx0YWN0aW9uOiAnYmVnaW5fY2hlY2tvdXQnLFxuXHRcdFx0XHRwcm9kdWN0LFxuXHRcdFx0fTtcblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwRGF0YUxheWVyRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0ZGF0YUxheWVyQmVnaW5DaGVja291dFxuXHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgZGF0YUxheWVyQ2FydEFjdGlvblxuXG5cdFx0Lypcblx0XHQgKiBjcmVhdGUgYW4gYW5hbHl0aWNzIHByb2R1Y3QgdmFyaWFibGVcblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0KGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHtcblx0XHRcdFx0aWQ6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdG5hbWU6XG5cdFx0XHRcdFx0J01pbm5Qb3N0ICcgK1xuXHRcdFx0XHRcdGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcblx0XHRcdFx0XHRsZXZlbC5zbGljZSgxKSArXG5cdFx0XHRcdFx0JyBNZW1iZXJzaGlwJyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdEb25hdGlvbicsXG5cdFx0XHRcdGJyYW5kOiAnTWlublBvc3QnLFxuXHRcdFx0XHR2YXJpYW50OiBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdHByaWNlOiBhbW91bnQsXG5cdFx0XHRcdHF1YW50aXR5OiAxLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBwcm9kdWN0O1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZShldmVudCkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJChldmVudC50YXJnZXQpLnZhbCgpKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cygkKGV2ZW50LnRhcmdldCkudmFsKCkpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvbkZyZXF1ZW5jeUNoYW5nZVxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdCQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKG51bGwpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvcihldmVudCk7XG5cblx0XHRcdGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCk7XG5cdFx0XHRpZiAoJHRhcmdldC5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJHRhcmdldC52YWwoKSkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGRlY2xpbmUgPSAkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cylcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cblx0XHRcdGlmIChkZWNsaW5lID09PSAndHJ1ZScpIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRnaWZ0T3B0aW9uU2VsZWN0KCkge1xuXHRcdFx0Y29uc3QgcGFyZW50ID0gJCh0aGlzLm9wdGlvbnMuZ2lmdE9wdGlvblNlbGVjdG9yKVxuXHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0LnBhcmVudCgpXG5cdFx0XHRcdC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKTtcblx0XHRcdCQodGhpcy5vcHRpb25zLmdpZnRPcHRpb25TZWxlY3RvcikuY2hhbmdlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsZWN0ZWRPcHRpb24gPSAkKHRoaXMpXG5cdFx0XHRcdFx0LmNoaWxkcmVuKCdvcHRpb246c2VsZWN0ZWQnKVxuXHRcdFx0XHRcdC52YWwoKTtcblx0XHRcdFx0aWYgKCcnICE9PSBzZWxlY3RlZE9wdGlvbikge1xuXHRcdFx0XHRcdHBhcmVudC5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBnaWZ0T3B0aW9uU2VsZWN0XG5cblx0XHRvbkdpZnRzQ2xpY2soZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0cyA9ICQodGhpcy5lbGVtZW50KVxuXHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKVxuXHRcdFx0XHQubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKTtcblx0XHRcdGNvbnN0ICRkZWNsaW5lID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsXG5cdFx0XHQpO1xuXHRcdFx0aWYgKCQoZXZlbnQudGFyZ2V0KS5pcyh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCkpIHtcblx0XHRcdFx0JGdpZnRzLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKTtcblx0XHRcdCRkZWNsaW5lLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0fSwgLy8gZW5kIG9uR2lmdHNDbGlja1xuXG5cdFx0c2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKSB7XG5cdFx0XHRjb25zdCAkY2hlY2tlZEdpZnRzID0gJGdpZnRzLmZpbHRlcignOmNoZWNrZWQnKTtcblx0XHRcdGlmICgkY2hlY2tlZEdpZnRzKSB7XG5cdFx0XHRcdCQoXCJbZGF0YS1yZXF1aXJlZD0ndHJ1ZSddXCIpLnByb3AoJ3JlcXVpcmVkJywgZmFsc2UpO1xuXHRcdFx0XHQkY2hlY2tlZEdpZnRzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHNldFJlcXVpcmVkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5wcm9wKCdyZXF1aXJlZCcsIHRydWUpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0JChcIltkYXRhLXJlcXVpcmVkPSd0cnVlJ11cIiwgJCh0aGlzKS5wYXJlbnQoKSkuZWFjaChcblx0XHRcdFx0XHRcdHNldFJlcXVpcmVkXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldFJlcXVpcmVkRmllbGRzXG5cblx0XHRvbkZvcm1TdWJtaXQoZXZlbnQpIHtcblx0XHRcdGxldCBhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcilcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cdFx0XHRpZiAodHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0YW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpLnZhbCgpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X3N0cmluZyA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkudmFsKCk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfaWQgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnByb3AoJ2lkJyk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbGFiZWwgPSAkKFxuXHRcdFx0XHQnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nXG5cdFx0XHQpLnRleHQoKTtcblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZVxuXHRcdFx0KTtcblxuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRcdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRcdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lLFxuXHRcdFx0fTtcblx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0Ly8gZ3RtIGNhbiBkZXRlY3QgdGhlIGZvcm0gc3VibWlzc2lvbiBpdHNlbGYuXG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0V2ZW50Jyxcblx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRvcHRpb25zLmNhdGVnb3J5LFxuXHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGhhc0NsYXNzID0gZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucyhcblx0XHRcdFx0J20tZm9ybS1tZW1iZXJzaGlwLXN1cHBvcnQnXG5cdFx0XHQpO1xuXHRcdFx0Ly8gaWYgdGhpcyBpcyB0aGUgbWFpbiBjaGVja291dCBmb3JtLCBzZW5kIGl0IHRvIHRoZSBlYyBwbHVnaW4gb3IgZ3RtIGFzIGEgY2hlY2tvdXRcblx0XHRcdGlmIChoYXNDbGFzcykge1xuXHRcdFx0XHR0aGlzLmFuYWx5dGljc0NhcnRBY3Rpb24obGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsKTtcblx0XHRcdFx0dGhpcy5kYXRhTGF5ZXJDYXJ0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uRm9ybVN1Ym1pdFxuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcihldmVudCkge1xuXHRcdFx0Y29uc3QgJHN1Z2dlc3RlZEFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yKTtcblxuXHRcdFx0aWYgKCQoZXZlbnQudGFyZ2V0KS52YWwoKSA9PT0gJycpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50LnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0fSwgLy8gZW5kIGNsZWFyQW1vdW50U2VsZWN0b3JcblxuXHRcdHNldEFtb3VudExhYmVscyhmcmVxdWVuY3lTdHJpbmcpIHtcblx0XHRcdGNvbnN0ICRncm91cHMgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCk7XG5cdFx0XHRjb25zdCAkc2VsZWN0ZWQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvcikuZmlsdGVyKCc6Y2hlY2tlZCcpO1xuXHRcdFx0Y29uc3QgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSgnaW5kZXgnKTtcblx0XHRcdGNvbnN0ICRjdXN0b21BbW91bnRGcmVxdWVuY3kgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuY3VzdG9tQW1vdW50RnJlcXVlbmN5XG5cdFx0XHQpO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdCRncm91cHNcblx0XHRcdFx0LmZpbHRlcignW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nKVxuXHRcdFx0XHQuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0JHNlbGVjdGVkLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHQkZ3JvdXBzXG5cdFx0XHRcdC5maWx0ZXIoJy5hY3RpdmUnKVxuXHRcdFx0XHQuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJylcblx0XHRcdFx0LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcblxuXHRcdFx0Y29uc3QgY3VycmVudEZyZXF1ZW5jeUxhYmVsID0gJGdyb3Vwc1xuXHRcdFx0XHQuZmlsdGVyKCcuYWN0aXZlJylcblx0XHRcdFx0LmZpbmQoJy5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJylcblx0XHRcdFx0LmZpcnN0KClcblx0XHRcdFx0LnRleHQoKTtcblx0XHRcdCRjdXN0b21BbW91bnRGcmVxdWVuY3kudGV4dChjdXJyZW50RnJlcXVlbmN5TGFiZWwpO1xuXHRcdH0sIC8vIGVuZCBzZXRBbW91bnRMYWJlbHNcblxuXHRcdHNldE1pbkFtb3VudHMoZnJlcXVlbmN5U3RyaW5nKSB7XG5cdFx0XHRjb25zdCAkZWxlbWVudHMgPSAkKHRoaXMub3B0aW9ucy5taW5BbW91bnRzKTtcblx0XHRcdCRlbGVtZW50cy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQkZWxlbWVudHNcblx0XHRcdFx0LmZpbHRlcignW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nKVxuXHRcdFx0XHQuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdH0sIC8vIGVuZCBzZXRNaW5BbW91bnRzXG5cblx0XHRjaGVja0FuZFNldExldmVsKHVwZGF0ZWQpIHtcblx0XHRcdGxldCBhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcilcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cdFx0XHRpZiAodHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0YW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpLnZhbCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfc3RyaW5nID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJ1xuXHRcdFx0KS52YWwoKTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9pZCA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkucHJvcCgnaWQnKTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9sYWJlbCA9ICQoXG5cdFx0XHRcdCdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXSdcblx0XHRcdCkudGV4dCgpO1xuXG5cdFx0XHRjb25zdCBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWVcblx0XHRcdCk7XG5cdFx0XHR0aGlzLnNob3dOZXdMZXZlbCh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwpO1xuXHRcdFx0dGhpcy5zZXRFbmFibGVkR2lmdHMobGV2ZWwpO1xuXHRcdFx0dGhpcy5hbmFseXRpY3NQcm9kdWN0QWN0aW9uKFxuXHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRhbW91bnQsXG5cdFx0XHRcdGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0J3NlbGVjdF9jb250ZW50Jyxcblx0XHRcdFx0MVxuXHRcdFx0KTtcblx0XHRcdHRoaXMuZGF0YUxheWVyUHJvZHVjdEFjdGlvbihcblx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdCdzZWxlY3RfaXRlbSdcblx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbChlbGVtZW50LCBvcHRpb25zLCBsZXZlbCkge1xuXHRcdFx0bGV0IG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdGxldCBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdGxldCBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdGNvbnN0IGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvJiMoXFxkKyk7L2csIGZ1bmN0aW9uIChtYXRjaCwgZGVjKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoZGVjKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPVxuXHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoJChvcHRpb25zLmxldmVsVmlld2VyKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcChcblx0XHRcdFx0XHQnY2xhc3MnLFxuXHRcdFx0XHRcdCdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbC5uYW1lLnRvTG93ZXJDYXNlKClcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0JChvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwpLmxlbmd0aCA+IDAgJiZcblx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPlxuXHRcdFx0XHRcdFx0MFxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRpZiAoKCdhJywgJChvcHRpb25zLmxldmVsVmlld2VyKS5sZW5ndGggPiAwKSkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPVxuXHRcdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZShcblx0XHRcdFx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCxcblx0XHRcdFx0XHRcdFx0Jydcblx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRpZiAob2xkX2xldmVsICE9PSBsZXZlbC5uYW1lLnRvTG93ZXJDYXNlKCkpIHtcblx0XHRcdFx0XHRcdCQobGV2ZWxWaWV3ZXJDb250YWluZXIpLmh0bWwoXG5cdFx0XHRcdFx0XHRcdGRlY29kZUh0bWxFbnRpdHkoXG5cdFx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5kYXRhKCdjaGFuZ2VkJylcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JChsZXZlbFZpZXdlckNvbnRhaW5lcikuaHRtbChcblx0XHRcdFx0XHRcdFx0ZGVjb2RlSHRtbEVudGl0eShcblx0XHRcdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLmRhdGEoJ25vdC1jaGFuZ2VkJylcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KGxldmVsLm5hbWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0cyhsZXZlbCkge1xuXHRcdFx0Y29uc3Qgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JCh0aGlzKS5wcm9wKFxuXHRcdFx0XHRcdCdkaXNhYmxlZCcsXG5cdFx0XHRcdFx0bGV2ZWwueWVhcmx5QW1vdW50IDwgJCh0aGlzKS5kYXRhKCdtaW5ZZWFybHlBbW91bnQnKVxuXHRcdFx0XHQpO1xuXHRcdFx0fTtcblxuXHRcdFx0JCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKS5lYWNoKHNldEVuYWJsZWQpO1xuXG5cdFx0XHRpZiAoXG5cdFx0XHRcdCQodGhpcy5vcHRpb25zLnN3YWdTZWxlY3Rvcikubm90KCcjc3dhZy1kZWNsaW5lJykuaXMoJzplbmFibGVkJylcblx0XHRcdCkge1xuXHRcdFx0XHQkKCcuc3dhZy1kaXNhYmxlZCcpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JCgnLnN3YWctZW5hYmxlZCcpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoJy5zd2FnLWRpc2FibGVkJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHQkKCcuc3dhZy1lbmFibGVkJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoISQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lKSkge1xuXHRcdFx0XHQkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbih0aGlzLCBvcHRpb25zKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KShqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCk7XG4iLCIoZnVuY3Rpb24gKCQpIHtcblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKFxuXHRcdFx0J2JhY2tfZm9yd2FyZCcgPT09XG5cdFx0XHRwZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlUeXBlKCduYXZpZ2F0aW9uJylbMF0udHlwZVxuXHRcdCkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKHRydWUpO1xuXHRcdH1cblx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKS5jbGljayhmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcblx0XHRcdGNvbnN0ICRzdGF0dXMgPSAkKCcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKHRoaXMpLnBhcmVudCgpKTtcblx0XHRcdGNvbnN0ICRzZWxlY3QgPSAkKCdzZWxlY3QnLCAkKHRoaXMpLnBhcmVudCgpKTtcblx0XHRcdGNvbnN0IHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCEnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnKSB7XG5cdFx0XHRcdCQoJy5tLWJlbmVmaXQtbWVzc2FnZScpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCgnUHJvY2Vzc2luZycpLmFkZENsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKS5hZGRDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0bGV0IGRhdGEgPSB7fTtcblx0XHRcdGNvbnN0IGJlbmVmaXRUeXBlID0gJCgnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpO1xuXHRcdFx0aWYgKCdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlKSB7XG5cdFx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2U6XG5cdFx0XHRcdFx0XHQkYnV0dG9uLmRhdGEoJ2JlbmVmaXQtbm9uY2UnKSxcblx0XHRcdFx0XHRjdXJyZW50X3VybDogJCgnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0XHRpbnN0YW5jZV9pZDogJChcblx0XHRcdFx0XHRcdCdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXSdcblx0XHRcdFx0XHQpLnZhbCgpLFxuXHRcdFx0XHRcdHBvc3RfaWQ6ICRidXR0b24udmFsKCksXG5cdFx0XHRcdFx0aXNfYWpheDogJzEnLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCQucG9zdChzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzXG5cdFx0XHRcdFx0XHRcdC5odG1sKHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKFxuXHRcdFx0XHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRpZiAoMCA8ICRzZWxlY3QubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJylcblx0XHRcdFx0XHRcdFx0Lm5vdCgkYnV0dG9uKVxuXHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gZXJyb3Jcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdFx0XHQndW5kZWZpbmVkJyA9PT1cblx0XHRcdFx0XHRcdFx0dHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoJ29wdGlvbicsICRzZWxlY3QpLmVhY2goZnVuY3Rpb24gKGkpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnZhbCgpID09PVxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWVcblx0XHRcdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJylcblx0XHRcdFx0XHRcdFx0Lm5vdCgkYnV0dG9uKVxuXHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJyk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzXG5cdFx0XHRcdFx0XHRcdC5odG1sKHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKFxuXHRcdFx0XHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoMCA8ICQoJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JykubGVuZ3RoKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0XHQkKCcuYS1yZWZyZXNoLXBhZ2UnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9KTtcblx0fSk7XG59KShqUXVlcnkpO1xuIiwiY29uc3QgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyk7XG5pZiAoYnV0dG9uKSB7XG5cdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGxldCB2YWx1ZSA9ICcnO1xuXHRcdGNvbnN0IHN2ZyA9IGJ1dHRvbi5xdWVyeVNlbGVjdG9yKCdzdmcnKTtcblx0XHRpZiAobnVsbCAhPT0gc3ZnKSB7XG5cdFx0XHRjb25zdCBhdHRyaWJ1dGUgPSBzdmcuZ2V0QXR0cmlidXRlKCd0aXRsZScpO1xuXHRcdFx0aWYgKG51bGwgIT09IGF0dHJpYnV0ZSkge1xuXHRcdFx0XHR2YWx1ZSA9IGF0dHJpYnV0ZSArICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFsdWUgPSB2YWx1ZSArIGJ1dHRvbi50ZXh0Q29udGVudDtcblx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHQnZXZlbnQnLFxuXHRcdFx0J1N1cHBvcnQgQ1RBIC0gSGVhZGVyJyxcblx0XHRcdCdDbGljazogJyArIHZhbHVlLFxuXHRcdFx0bG9jYXRpb24ucGF0aG5hbWVcblx0XHQpO1xuXHR9KTtcbn1cbiIsIi8vIHBsdWdpblxuKGZ1bmN0aW9uICgkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAsIHVuZGVmaW5lZCkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0Y29uc3QgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0ZGVidWc6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHRcdGFtb3VudF92aWV3ZXI6ICcuYW1vdW50IGgzJyxcblx0XHRcdGZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdFx0ZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlOiAnc2VsZWN0Jyxcblx0XHRcdGxldmVsc19jb250YWluZXI6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdFx0c2luZ2xlX2xldmVsX2NvbnRhaW5lcjogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHRcdHNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHRcdGZsaXBwZWRfaXRlbXM6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdFx0bGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3I6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdFx0Y2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHRcdGFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0XHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdChyZXNldCwgYW1vdW50KSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0dGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJlxuXHRcdFx0XHRcdGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgPT1cblx0XHRcdFx0XHRcdHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSAmJlxuXHRcdFx0XHRcdGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWVcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQubGVuZ3RoXG5cdFx0XHRcdFx0XHQ/IHRhcmdldFxuXHRcdFx0XHRcdFx0OiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsgJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZShcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcCxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0MTAwMFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXIoZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0Y29uc3QgdGhhdCA9IHRoaXM7XG5cdFx0XHRsZXQgYW1vdW50ID0gMDtcblx0XHRcdGxldCBsZXZlbCA9ICcnO1xuXHRcdFx0bGV0IGxldmVsX251bWJlciA9IDA7XG5cdFx0XHRsZXQgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICgkKG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lcikubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLmVhY2goXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykpLndyYXBBbGwoXG5cdFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQpLm9uKFxuXHRcdFx0XHRcdCdjaGFuZ2UnLFxuXHRcdFx0XHRcdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0XHQpLnJlbW92ZUNsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KVxuXHRcdFx0XHRcdFx0XHRcdC5jbG9zZXN0KG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpXG5cdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGZyZXF1ZW5jeSA9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQpLnZhbChcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3ZpZXdlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0XHQpLmRhdGEoJ2RlZmF1bHQteWVhcmx5Jylcblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeSA9PSAxMikge1xuXHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0KS52YWwoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF92aWV3ZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdkZWZhdWx0LW1vbnRobHknKVxuXHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgK1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdCdcIl0nXG5cdFx0XHRcdFx0XHRcdCkudmFsKCk7XG5cblx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koXG5cdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyxcblx0XHRcdFx0XHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbChcblx0XHRcdFx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyhcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyxcblx0XHRcdFx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoJChvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCkuY2xpY2soXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdCkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdFx0XHQnYWN0aXZlJ1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KVxuXHRcdFx0XHRcdFx0XHQuY2xvc2VzdChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdCQodGhpcykucGFyZW50KClcblx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArXG5cdFx0XHRcdFx0XHRcdFx0J1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgK1xuXHRcdFx0XHRcdFx0XHRcdCdcIl0nXG5cdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWwoYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHR0eXBlXG5cdFx0XHQpO1xuXG5cdFx0XHQkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWwubmFtZSkge1xuXHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHRcdCdhY3RpdmUnXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5KHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bGV0IHJhbmdlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbW9udGhfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnbW9udGgnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IHllYXJfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQneWVhcidcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3Qgb25jZV92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdvbmUtdGltZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeSA9IHBhcnNlSW50KHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSk7XG5cblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMpLnZhbChzZWxlY3RlZCk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzKS5wcm9wKFxuXHRcdFx0XHRcdCdzZWxlY3RlZCcsXG5cdFx0XHRcdFx0c2VsZWN0ZWRcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5yZW1vdmVDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicpIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJykge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KHJhbmdlKTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J2ZyZXF1ZW5jeScsXG5cdFx0XHRcdFx0ZnJlcXVlbmN5XG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3KHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bGV0IHJhbmdlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbW9udGhfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnbW9udGgnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IHllYXJfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQneWVhcidcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3Qgb25jZV92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdvbmUtdGltZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkucmVtb3ZlQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dChyYW5nZSk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3QgbGV2ZWxfY2xhc3MgPSAkKHRoaXMpLnByb3AoJ2NsYXNzJyk7XG5cdFx0XHRcdGNvbnN0IGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdmbGlwcGVkJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0J2FjdGl2ZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0JChcblx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsXG5cdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHQpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JChcblx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdGxldmVsX251bWJlciArXG5cdFx0XHRcdFx0XHQnICcgK1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvclxuXHRcdFx0XHQpLmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCEkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSkpIHtcblx0XHRcdFx0JC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4odGhpcywgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApO1xuIl19
}(jQuery));
