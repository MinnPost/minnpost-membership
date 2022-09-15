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
      $gifts.on('click', this.onGiftsClick.bind(this)); // when the form is submitted

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsInllYXJseUFtb3VudCIsIm5hbWUiLCJudW1iZXIiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwiJCIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwibGV2ZWxWaWV3ZXIiLCJsZXZlbE5hbWUiLCJ1c2VyQ3VycmVudExldmVsIiwiZGVjbGluZUJlbmVmaXRzIiwiZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZ2lmdExldmVsIiwiZ2lmdFNlbGVjdG9yIiwiZ2lmdE9wdGlvblNlbGVjdG9yIiwiZ2lmdExhYmVsIiwic3dhZ0VsaWdpYmlsaXR5VGV4dCIsInN3YWdTZWxlY3RvciIsInN3YWdMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZUdpZnRMZXZlbCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkZm9ybSIsIiRzdWdnZXN0ZWRBbW91bnQiLCIkYW1vdW50IiwiJGRlY2xpbmVCZW5lZml0cyIsIiRnaWZ0cyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJnaWZ0T3B0aW9uU2VsZWN0Iiwic2V0UmVxdWlyZWRGaWVsZHMiLCJvbkdpZnRzQ2xpY2siLCJxdWVyeVNlbGVjdG9yQWxsIiwiZm9yRWFjaCIsIm1lbWJlcnNoaXBGb3JtIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2ZW50Iiwib25Gb3JtU3VibWl0IiwiYW5hbHl0aWNzUHJvZHVjdEFjdGlvbiIsImZyZXF1ZW5jeV9sYWJlbCIsImFjdGlvbiIsInN0ZXAiLCJwcm9kdWN0IiwiYW5hbHl0aWNzUHJvZHVjdCIsIndwIiwiaG9va3MiLCJkb0FjdGlvbiIsImlkIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwiY2F0ZWdvcnkiLCJicmFuZCIsInZhcmlhbnQiLCJwcmljZSIsInF1YW50aXR5IiwidGFyZ2V0IiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwicGFyZW50IiwiY2hhbmdlIiwic2VsZWN0ZWRPcHRpb24iLCJjaGlsZHJlbiIsIiRkZWNsaW5lIiwiJGNoZWNrZWRHaWZ0cyIsImVhY2giLCJzZXRSZXF1aXJlZCIsImZyZXF1ZW5jeV9zdHJpbmciLCJzcGxpdCIsImZyZXF1ZW5jeV9uYW1lIiwiZnJlcXVlbmN5X2lkIiwidGV4dCIsImxhYmVsIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhhc0NsYXNzIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCIkY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImN1cnJlbnRGcmVxdWVuY3lMYWJlbCIsImZpcnN0IiwiJGVsZW1lbnRzIiwidXBkYXRlZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsImZuIiwialF1ZXJ5IiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwibWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UiLCJjdXJyZW50X3VybCIsImluc3RhbmNlX2lkIiwicG9zdF9pZCIsImlzX2FqYXgiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsImJ1dHRvbl9hdHRyIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwiaSIsInJlbW92ZSIsInJlYWR5IiwiYnV0dG9uIiwicXVlcnlTZWxlY3RvciIsInZhbHVlIiwic3ZnIiwiYXR0cmlidXRlIiwiZ2V0QXR0cmlidXRlIiwidGV4dENvbnRlbnQiLCJ1bmRlZmluZWQiLCJkZWJ1ZyIsImFtb3VudF92aWV3ZXIiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwiaG9zdG5hbWUiLCJoYXNoIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJsZXZlbF9udW1iZXIiLCJ3cmFwQWxsIiwiY2xvc2VzdCIsImNoYW5nZUZyZXF1ZW5jeSIsImNoYW5nZUFtb3VudFByZXZpZXciLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBLENBQUMsVUFBVUEsTUFBVixFQUFrQjtFQUNsQixTQUFTQyxrQkFBVCxDQUE0QkMsSUFBNUIsRUFBa0NDLFFBQWxDLEVBQTRDO0lBQzNDLEtBQUtELElBQUwsR0FBWSxFQUFaOztJQUNBLElBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztNQUNoQyxLQUFLQSxJQUFMLEdBQVlBLElBQVo7SUFDQTs7SUFFRCxLQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztJQUNBLElBQUksT0FBT0EsUUFBUCxLQUFvQixX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SixDQUFXLElBQVgsRUFBaUJFLE9BQWpCLENBQXJDO01BQ0E7SUFDRCxDQUpNLENBQVA7RUFLQSxDQU5EO0FBT0EsQ0EvV0QsRUErV0c0RyxNQS9XSCxFQStXV3BLLE1BL1dYLEVBK1dtQjZCLFFBL1duQixFQStXNkI1QixrQkEvVzdCIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICh3aW5kb3cpIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKGRhdGEsIHNldHRpbmdzKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKFxuXHRcdFx0dHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0XHR0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnXG5cdFx0KSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsKGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlKSB7XG5cdFx0XHRsZXQgdGhpc3llYXIgPSBwYXJzZUludChhbW91bnQpICogcGFyc2VJbnQoZnJlcXVlbmN5KTtcblx0XHRcdGlmIChcblx0XHRcdFx0dHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnXG5cdFx0XHQpIHtcblx0XHRcdFx0bGV0IHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoXG5cdFx0XHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLFxuXHRcdFx0XHRcdDEwXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGxldCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KFxuXHRcdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsXG5cdFx0XHRcdFx0MTBcblx0XHRcdFx0KTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICh0eXBlID09PSAnb25lLXRpbWUnKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KFxuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50LFxuXHRcdFx0XHRcdGNvbWluZ195ZWFyX2Ftb3VudCxcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCh0aGlzeWVhcik7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsKHRoaXN5ZWFyKSB7XG5cdFx0XHRjb25zdCBsZXZlbCA9IHtcblx0XHRcdFx0eWVhcmx5QW1vdW50OiB0aGlzeWVhcixcblx0XHRcdH07XG5cdFx0XHRpZiAodGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbC5udW1iZXIgPSAxO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsLm5hbWUgPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWwubnVtYmVyID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWwubmFtZSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsLm51bWJlciA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkod2luZG93KTtcbiIsIi8vIHBsdWdpblxuKGZ1bmN0aW9uICgkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdGNvbnN0IHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRcdGRlY2xpbmVCZW5lZml0czogJy5tLWRlY2xpbmUtYmVuZWZpdHMtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdFx0Z2lmdExldmVsOiAnLm0tZ2lmdC1sZXZlbCcsXG5cdFx0XHRnaWZ0U2VsZWN0b3I6ICcubS1naWZ0LWxldmVsIC5tLWZvcm0taXRlbSBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdFx0Z2lmdE9wdGlvblNlbGVjdG9yOiAnLmEtZ2lmdC1vcHRpb24tc2VsZWN0Jyxcblx0XHRcdGdpZnRMYWJlbDogJy5tLWdpZnQtbGV2ZWwgLm0tZm9ybS1pdGVtIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRcdHN3YWdFbGlnaWJpbGl0eVRleHQ6XG5cdFx0XHRcdCcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLnN3YWctZWxpZ2liaWxpdHknLFxuXHRcdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRcdHN3YWdMYWJlbHM6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0XHRtaW5BbW91bnRzOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5taW4tYW1vdW50Jyxcblx0XHRcdGRlY2xpbmVHaWZ0TGV2ZWw6ICcubS1kZWNsaW5lLWxldmVsJyxcblx0XHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbihlbGVtZW50LCBvcHRpb25zKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0KCkge1xuXHRcdFx0Y29uc3QgJGZyZXF1ZW5jeSA9ICQodGhpcy5lbGVtZW50KS5maW5kKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3Jcblx0XHRcdCk7XG5cdFx0XHRjb25zdCAkZm9ybSA9ICQodGhpcy5lbGVtZW50KTtcblx0XHRcdGNvbnN0ICRzdWdnZXN0ZWRBbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcik7XG5cdFx0XHRjb25zdCAkYW1vdW50ID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKTtcblx0XHRcdGNvbnN0ICRkZWNsaW5lQmVuZWZpdHMgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0c1xuXHRcdFx0KTtcblx0XHRcdGNvbnN0ICRnaWZ0cyA9ICQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0b3IpO1xuXHRcdFx0aWYgKFxuXHRcdFx0XHQhKFxuXHRcdFx0XHRcdCRhbW91bnQubGVuZ3RoID4gMCAmJlxuXHRcdFx0XHRcdCRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0XHRcdCRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMFxuXHRcdFx0XHQpXG5cdFx0XHQpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cygkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoZmFsc2UpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykpO1xuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5vbihcblx0XHRcdFx0J2NoYW5nZScsXG5cdFx0XHRcdHRoaXMub25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UuYmluZCh0aGlzKVxuXHRcdFx0KTtcblx0XHRcdCRhbW91bnQub24oJ2tleXVwIG1vdXNldXAnLCB0aGlzLm9uQW1vdW50Q2hhbmdlLmJpbmQodGhpcykpO1xuXG5cdFx0XHRpZiAoISgkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJGdpZnRzLmxlbmd0aCA+IDApKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoJGdpZnRzLm5vdCh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCkuaXMoJzpjaGVja2VkJykpIHtcblx0XHRcdFx0JCh0aGlzLmVsZW1lbnQpXG5cdFx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwpXG5cdFx0XHRcdFx0LnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblx0XHRcdHRoaXMuZ2lmdE9wdGlvblNlbGVjdCgpO1xuXHRcdFx0dGhpcy5zZXRSZXF1aXJlZEZpZWxkcygkZ2lmdHMpO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKFxuXHRcdFx0XHQnY2hhbmdlJyxcblx0XHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKHRoaXMpXG5cdFx0XHQpO1xuXHRcdFx0JGdpZnRzLm9uKCdjbGljaycsIHRoaXMub25HaWZ0c0NsaWNrLmJpbmQodGhpcykpO1xuXG5cdFx0XHQvLyB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZFxuXHRcdFx0ZG9jdW1lbnRcblx0XHRcdFx0LnF1ZXJ5U2VsZWN0b3JBbGwoJy5tLWZvcm0tbWVtYmVyc2hpcCcpXG5cdFx0XHRcdC5mb3JFYWNoKChtZW1iZXJzaGlwRm9ybSkgPT5cblx0XHRcdFx0XHRtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KGV2ZW50KTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHQvKlxuXHRcdCAqIHJ1biBhbiBhbmFseXRpY3MgcHJvZHVjdCBhY3Rpb25cblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0QWN0aW9uKGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uLCBzdGVwKSB7XG5cdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRsZXZlbCxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWxcblx0XHRcdCk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsXG5cdFx0XHRcdCdldmVudCcsXG5cdFx0XHRcdGFjdGlvbixcblx0XHRcdFx0cHJvZHVjdCxcblx0XHRcdFx0c3RlcFxuXHRcdFx0KTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0Lypcblx0XHQgKiBjcmVhdGUgYW4gYW5hbHl0aWNzIHByb2R1Y3QgdmFyaWFibGVcblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0KGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCkge1xuXHRcdFx0Y29uc3QgcHJvZHVjdCA9IHtcblx0XHRcdFx0aWQ6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdG5hbWU6XG5cdFx0XHRcdFx0J01pbm5Qb3N0ICcgK1xuXHRcdFx0XHRcdGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICtcblx0XHRcdFx0XHRsZXZlbC5zbGljZSgxKSArXG5cdFx0XHRcdFx0JyBNZW1iZXJzaGlwJyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdEb25hdGlvbicsXG5cdFx0XHRcdGJyYW5kOiAnTWlublBvc3QnLFxuXHRcdFx0XHR2YXJpYW50OiBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdHByaWNlOiBhbW91bnQsXG5cdFx0XHRcdHF1YW50aXR5OiAxLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBwcm9kdWN0O1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZShldmVudCkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoJChldmVudC50YXJnZXQpLnZhbCgpKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cygkKGV2ZW50LnRhcmdldCkudmFsKCkpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvbkZyZXF1ZW5jeUNoYW5nZVxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdCQodGhpcy5lbGVtZW50KS5maW5kKHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCkudmFsKG51bGwpO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvcihldmVudCk7XG5cblx0XHRcdGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCk7XG5cdFx0XHRpZiAoJHRhcmdldC5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJHRhcmdldC52YWwoKSkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKHRydWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKHRoaXMuZWxlbWVudCkuZmluZChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cFxuXHRcdFx0KTtcblx0XHRcdGNvbnN0IGRlY2xpbmUgPSAkKHRoaXMuZWxlbWVudClcblx0XHRcdFx0LmZpbmQodGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cylcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cblx0XHRcdGlmIChkZWNsaW5lID09PSAndHJ1ZScpIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRnaWZ0T3B0aW9uU2VsZWN0KCkge1xuXHRcdFx0Y29uc3QgcGFyZW50ID0gJCh0aGlzLm9wdGlvbnMuZ2lmdE9wdGlvblNlbGVjdG9yKVxuXHRcdFx0XHQucGFyZW50KClcblx0XHRcdFx0LnBhcmVudCgpXG5cdFx0XHRcdC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKTtcblx0XHRcdCQodGhpcy5vcHRpb25zLmdpZnRPcHRpb25TZWxlY3RvcikuY2hhbmdlKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3Qgc2VsZWN0ZWRPcHRpb24gPSAkKHRoaXMpXG5cdFx0XHRcdFx0LmNoaWxkcmVuKCdvcHRpb246c2VsZWN0ZWQnKVxuXHRcdFx0XHRcdC52YWwoKTtcblx0XHRcdFx0aWYgKCcnICE9PSBzZWxlY3RlZE9wdGlvbikge1xuXHRcdFx0XHRcdHBhcmVudC5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBnaWZ0T3B0aW9uU2VsZWN0XG5cblx0XHRvbkdpZnRzQ2xpY2soZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRnaWZ0cyA9ICQodGhpcy5lbGVtZW50KVxuXHRcdFx0XHQuZmluZCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKVxuXHRcdFx0XHQubm90KHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsKTtcblx0XHRcdGNvbnN0ICRkZWNsaW5lID0gJCh0aGlzLmVsZW1lbnQpLmZpbmQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsXG5cdFx0XHQpO1xuXHRcdFx0aWYgKCQoZXZlbnQudGFyZ2V0KS5pcyh0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCkpIHtcblx0XHRcdFx0JGdpZnRzLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHRoaXMuc2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKTtcblx0XHRcdCRkZWNsaW5lLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG5cdFx0fSwgLy8gZW5kIG9uR2lmdHNDbGlja1xuXG5cdFx0c2V0UmVxdWlyZWRGaWVsZHMoJGdpZnRzKSB7XG5cdFx0XHRjb25zdCAkY2hlY2tlZEdpZnRzID0gJGdpZnRzLmZpbHRlcignOmNoZWNrZWQnKTtcblx0XHRcdGlmICgkY2hlY2tlZEdpZnRzKSB7XG5cdFx0XHRcdCQoXCJbZGF0YS1yZXF1aXJlZD0ndHJ1ZSddXCIpLnByb3AoJ3JlcXVpcmVkJywgZmFsc2UpO1xuXHRcdFx0XHQkY2hlY2tlZEdpZnRzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGNvbnN0IHNldFJlcXVpcmVkID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JCh0aGlzKS5wcm9wKCdyZXF1aXJlZCcsIHRydWUpO1xuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0JChcIltkYXRhLXJlcXVpcmVkPSd0cnVlJ11cIiwgJCh0aGlzKS5wYXJlbnQoKSkuZWFjaChcblx0XHRcdFx0XHRcdHNldFJlcXVpcmVkXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldFJlcXVpcmVkRmllbGRzXG5cblx0XHRvbkZvcm1TdWJtaXQoZXZlbnQpIHtcblx0XHRcdGxldCBhbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcilcblx0XHRcdFx0LmZpbHRlcignOmNoZWNrZWQnKVxuXHRcdFx0XHQudmFsKCk7XG5cdFx0XHRpZiAodHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0YW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQpLnZhbCgpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X3N0cmluZyA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkudmFsKCk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfaWQgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnByb3AoJ2lkJyk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbGFiZWwgPSAkKFxuXHRcdFx0XHQnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nXG5cdFx0XHQpLnRleHQoKTtcblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZVxuXHRcdFx0KTtcblxuXHRcdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRcdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRcdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lLFxuXHRcdFx0fTtcblx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdCk7XG5cdFx0XHRjb25zdCBoYXNDbGFzcyA9IGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoXG5cdFx0XHRcdCdtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0J1xuXHRcdFx0KTtcblx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdGlmIChoYXNDbGFzcykge1xuXHRcdFx0XHRjb25zdCBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KFxuXHRcdFx0XHRcdGxldmVsLm5hbWUsXG5cdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdGZyZXF1ZW5jeV9sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHRcdCdhZGRfdG9fY2FydCcsXG5cdFx0XHRcdFx0cHJvZHVjdFxuXHRcdFx0XHQpO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJyxcblx0XHRcdFx0XHQnZXZlbnQnLFxuXHRcdFx0XHRcdCdiZWdpbl9jaGVja291dCcsXG5cdFx0XHRcdFx0cHJvZHVjdFxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkZvcm1TdWJtaXRcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3IoZXZlbnQpIHtcblx0XHRcdGNvbnN0ICRzdWdnZXN0ZWRBbW91bnQgPSAkKHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3Rvcik7XG5cblx0XHRcdGlmICgkKGV2ZW50LnRhcmdldCkudmFsKCkgPT09ICcnKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHMoZnJlcXVlbmN5U3RyaW5nKSB7XG5cdFx0XHRjb25zdCAkZ3JvdXBzID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50R3JvdXApO1xuXHRcdFx0Y29uc3QgJHNlbGVjdGVkID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpLmZpbHRlcignOmNoZWNrZWQnKTtcblx0XHRcdGNvbnN0IGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoJ2luZGV4Jyk7XG5cdFx0XHRjb25zdCAkY3VzdG9tQW1vdW50RnJlcXVlbmN5ID0gJChcblx0XHRcdFx0dGhpcy5vcHRpb25zLmN1c3RvbUFtb3VudEZyZXF1ZW5jeVxuXHRcdFx0KTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHQkZ3JvdXBzXG5cdFx0XHRcdC5maWx0ZXIoJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJylcblx0XHRcdFx0LmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCdjaGVja2VkJywgZmFsc2UpO1xuXHRcdFx0JGdyb3Vwc1xuXHRcdFx0XHQuZmlsdGVyKCcuYWN0aXZlJylcblx0XHRcdFx0LmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScpXG5cdFx0XHRcdC5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cblx0XHRcdGNvbnN0IGN1cnJlbnRGcmVxdWVuY3lMYWJlbCA9ICRncm91cHNcblx0XHRcdFx0LmZpbHRlcignLmFjdGl2ZScpXG5cdFx0XHRcdC5maW5kKCcuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcpXG5cdFx0XHRcdC5maXJzdCgpXG5cdFx0XHRcdC50ZXh0KCk7XG5cdFx0XHQkY3VzdG9tQW1vdW50RnJlcXVlbmN5LnRleHQoY3VycmVudEZyZXF1ZW5jeUxhYmVsKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRNaW5BbW91bnRzKGZyZXF1ZW5jeVN0cmluZykge1xuXHRcdFx0Y29uc3QgJGVsZW1lbnRzID0gJCh0aGlzLm9wdGlvbnMubWluQW1vdW50cyk7XG5cdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0JGVsZW1lbnRzXG5cdFx0XHRcdC5maWx0ZXIoJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJylcblx0XHRcdFx0LmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHR9LCAvLyBlbmQgc2V0TWluQW1vdW50c1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbCh1cGRhdGVkKSB7XG5cdFx0XHRsZXQgYW1vdW50ID0gJCh0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IpXG5cdFx0XHRcdC5maWx0ZXIoJzpjaGVja2VkJylcblx0XHRcdFx0LnZhbCgpO1xuXHRcdFx0aWYgKHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQodGhpcy5vcHRpb25zLmFtb3VudEZpZWxkKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgZnJlcXVlbmN5X3N0cmluZyA9ICQoXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCdcblx0XHRcdCkudmFsKCk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdGNvbnN0IGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfaWQgPSAkKFxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnXG5cdFx0XHQpLnByb3AoJ2lkJyk7XG5cdFx0XHRjb25zdCBmcmVxdWVuY3lfbGFiZWwgPSAkKFxuXHRcdFx0XHQnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nXG5cdFx0XHQpLnRleHQoKTtcblxuXHRcdFx0Y29uc3QgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbChcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdGZyZXF1ZW5jeV9uYW1lXG5cdFx0XHQpO1xuXHRcdFx0dGhpcy5zaG93TmV3TGV2ZWwodGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMsIGxldmVsKTtcblx0XHRcdHRoaXMuc2V0RW5hYmxlZEdpZnRzKGxldmVsKTtcblx0XHRcdHRoaXMuYW5hbHl0aWNzUHJvZHVjdEFjdGlvbihcblx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdCdzZWxlY3RfY29udGVudCcsXG5cdFx0XHRcdDFcblx0XHRcdCk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbChlbGVtZW50LCBvcHRpb25zLCBsZXZlbCkge1xuXHRcdFx0bGV0IG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdGxldCBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdGxldCBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdGNvbnN0IGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSgvJiMoXFxkKyk7L2csIGZ1bmN0aW9uIChtYXRjaCwgZGVjKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoZGVjKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPVxuXHRcdFx0XHRcdG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoJChvcHRpb25zLmxldmVsVmlld2VyKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcChcblx0XHRcdFx0XHQnY2xhc3MnLFxuXHRcdFx0XHRcdCdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbC5uYW1lLnRvTG93ZXJDYXNlKClcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0JChvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwpLmxlbmd0aCA+IDAgJiZcblx0XHRcdFx0XHRtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPlxuXHRcdFx0XHRcdFx0MFxuXHRcdFx0XHQpIHtcblx0XHRcdFx0XHRpZiAoKCdhJywgJChvcHRpb25zLmxldmVsVmlld2VyKS5sZW5ndGggPiAwKSkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPVxuXHRcdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZShcblx0XHRcdFx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCxcblx0XHRcdFx0XHRcdFx0Jydcblx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRpZiAob2xkX2xldmVsICE9PSBsZXZlbC5uYW1lLnRvTG93ZXJDYXNlKCkpIHtcblx0XHRcdFx0XHRcdCQobGV2ZWxWaWV3ZXJDb250YWluZXIpLmh0bWwoXG5cdFx0XHRcdFx0XHRcdGRlY29kZUh0bWxFbnRpdHkoXG5cdFx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5kYXRhKCdjaGFuZ2VkJylcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JChsZXZlbFZpZXdlckNvbnRhaW5lcikuaHRtbChcblx0XHRcdFx0XHRcdFx0ZGVjb2RlSHRtbEVudGl0eShcblx0XHRcdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLmRhdGEoJ25vdC1jaGFuZ2VkJylcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KGxldmVsLm5hbWUpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0cyhsZXZlbCkge1xuXHRcdFx0Y29uc3Qgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0JCh0aGlzKS5wcm9wKFxuXHRcdFx0XHRcdCdkaXNhYmxlZCcsXG5cdFx0XHRcdFx0bGV2ZWwueWVhcmx5QW1vdW50IDwgJCh0aGlzKS5kYXRhKCdtaW5ZZWFybHlBbW91bnQnKVxuXHRcdFx0XHQpO1xuXHRcdFx0fTtcblxuXHRcdFx0JCh0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdG9yKS5lYWNoKHNldEVuYWJsZWQpO1xuXG5cdFx0XHRpZiAoXG5cdFx0XHRcdCQodGhpcy5vcHRpb25zLnN3YWdTZWxlY3Rvcikubm90KCcjc3dhZy1kZWNsaW5lJykuaXMoJzplbmFibGVkJylcblx0XHRcdCkge1xuXHRcdFx0XHQkKCcuc3dhZy1kaXNhYmxlZCcpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JCgnLnN3YWctZW5hYmxlZCcpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoJy5zd2FnLWRpc2FibGVkJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0XHQkKCcuc3dhZy1lbmFibGVkJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoISQuZGF0YSh0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lKSkge1xuXHRcdFx0XHQkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbih0aGlzLCBvcHRpb25zKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KShqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCk7XG4iLCIoZnVuY3Rpb24gKCQpIHtcblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKHRydWUpO1xuXHRcdH1cblx0XHQkKCcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcpLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJyk7XG5cdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKS5jbGljayhmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcblx0XHRcdGNvbnN0ICRzdGF0dXMgPSAkKCcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKHRoaXMpLnBhcmVudCgpKTtcblx0XHRcdGNvbnN0ICRzZWxlY3QgPSAkKCdzZWxlY3QnLCAkKHRoaXMpLnBhcmVudCgpKTtcblx0XHRcdGNvbnN0IHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCEnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnKSB7XG5cdFx0XHRcdCQoJy5tLWJlbmVmaXQtbWVzc2FnZScpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCgnUHJvY2Vzc2luZycpLmFkZENsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCgnLmEtYmVuZWZpdC1idXR0b24nKS5hZGRDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0bGV0IGRhdGEgPSB7fTtcblx0XHRcdGNvbnN0IGJlbmVmaXRUeXBlID0gJCgnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpO1xuXHRcdFx0aWYgKCdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlKSB7XG5cdFx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdFx0bWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2U6XG5cdFx0XHRcdFx0XHQkYnV0dG9uLmRhdGEoJ2JlbmVmaXQtbm9uY2UnKSxcblx0XHRcdFx0XHRjdXJyZW50X3VybDogJCgnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0XHRpbnN0YW5jZV9pZDogJChcblx0XHRcdFx0XHRcdCdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXSdcblx0XHRcdFx0XHQpLnZhbCgpLFxuXHRcdFx0XHRcdHBvc3RfaWQ6ICRidXR0b24udmFsKCksXG5cdFx0XHRcdFx0aXNfYWpheDogJzEnLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCQucG9zdChzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvblxuXHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0LnJlbW92ZUNsYXNzKCdhLWJ1dHRvbi1kaXNhYmxlZCcpXG5cdFx0XHRcdFx0XHRcdC5hZGRDbGFzcyhyZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcylcblx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzXG5cdFx0XHRcdFx0XHRcdC5odG1sKHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKFxuXHRcdFx0XHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRpZiAoMCA8ICRzZWxlY3QubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJylcblx0XHRcdFx0XHRcdFx0Lm5vdCgkYnV0dG9uKVxuXHRcdFx0XHRcdFx0XHQudmFsKHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gZXJyb3Jcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdFx0XHQndW5kZWZpbmVkJyA9PT1cblx0XHRcdFx0XHRcdFx0dHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0aWYgKCcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoJ29wdGlvbicsICRzZWxlY3QpLmVhY2goZnVuY3Rpb24gKGkpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpLnZhbCgpID09PVxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWVcblx0XHRcdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdC52YWwocmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQudGV4dChyZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbClcblx0XHRcdFx0XHRcdFx0XHRcdC5yZW1vdmVDbGFzcygnYS1idXR0b24tZGlzYWJsZWQnKVxuXHRcdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzKVxuXHRcdFx0XHRcdFx0XHRcdFx0LnByb3AocmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoJy5hLWJlbmVmaXQtYnV0dG9uJylcblx0XHRcdFx0XHRcdFx0Lm5vdCgkYnV0dG9uKVxuXHRcdFx0XHRcdFx0XHQucmVtb3ZlQ2xhc3MoJ2EtYnV0dG9uLWRpc2FibGVkJyk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzXG5cdFx0XHRcdFx0XHRcdC5odG1sKHJlc3BvbnNlLmRhdGEubWVzc2FnZSlcblx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKFxuXHRcdFx0XHRcdFx0XHRcdCdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoMCA8ICQoJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JykubGVuZ3RoKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0XHQkKCcuYS1yZWZyZXNoLXBhZ2UnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9KTtcblx0fSk7XG59KShqUXVlcnkpO1xuIiwiY29uc3QgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyk7XG5pZiAoYnV0dG9uKSB7XG5cdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGxldCB2YWx1ZSA9ICcnO1xuXHRcdGNvbnN0IHN2ZyA9IGJ1dHRvbi5xdWVyeVNlbGVjdG9yKCdzdmcnKTtcblx0XHRpZiAobnVsbCAhPT0gc3ZnKSB7XG5cdFx0XHRjb25zdCBhdHRyaWJ1dGUgPSBzdmcuZ2V0QXR0cmlidXRlKCd0aXRsZScpO1xuXHRcdFx0aWYgKG51bGwgIT09IGF0dHJpYnV0ZSkge1xuXHRcdFx0XHR2YWx1ZSA9IGF0dHJpYnV0ZSArICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFsdWUgPSB2YWx1ZSArIGJ1dHRvbi50ZXh0Q29udGVudDtcblx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHQnZXZlbnQnLFxuXHRcdFx0J1N1cHBvcnQgQ1RBIC0gSGVhZGVyJyxcblx0XHRcdCdDbGljazogJyArIHZhbHVlLFxuXHRcdFx0bG9jYXRpb24ucGF0aG5hbWVcblx0XHQpO1xuXHR9KTtcbn1cbiIsIi8vIHBsdWdpblxuKGZ1bmN0aW9uICgkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAsIHVuZGVmaW5lZCkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0Y29uc3QgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0ZGVidWc6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHRcdGFtb3VudF92aWV3ZXI6ICcuYW1vdW50IGgzJyxcblx0XHRcdGZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdFx0ZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlOiAnc2VsZWN0Jyxcblx0XHRcdGxldmVsc19jb250YWluZXI6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdFx0c2luZ2xlX2xldmVsX2NvbnRhaW5lcjogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHRcdHNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHRcdGZsaXBwZWRfaXRlbXM6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdFx0bGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3I6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdFx0Y2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHRcdGFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHM6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0XHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdChyZXNldCwgYW1vdW50KSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlcih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayh0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0dGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJlxuXHRcdFx0XHRcdGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgPT1cblx0XHRcdFx0XHRcdHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSAmJlxuXHRcdFx0XHRcdGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWVcblx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQubGVuZ3RoXG5cdFx0XHRcdFx0XHQ/IHRhcmdldFxuXHRcdFx0XHRcdFx0OiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsgJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZShcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcCxcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0MTAwMFxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXIoZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0Y29uc3QgdGhhdCA9IHRoaXM7XG5cdFx0XHRsZXQgYW1vdW50ID0gMDtcblx0XHRcdGxldCBsZXZlbCA9ICcnO1xuXHRcdFx0bGV0IGxldmVsX251bWJlciA9IDA7XG5cdFx0XHRsZXQgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0bGV0IGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICgkKG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lcikubGVuZ3RoID4gMCkge1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLmVhY2goXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykpLndyYXBBbGwoXG5cdFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0KTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQpLm9uKFxuXHRcdFx0XHRcdCdjaGFuZ2UnLFxuXHRcdFx0XHRcdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0XHQpLnJlbW92ZUNsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0XHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KVxuXHRcdFx0XHRcdFx0XHRcdC5jbG9zZXN0KG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpXG5cdFx0XHRcdFx0XHRcdFx0LmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGZyZXF1ZW5jeSA9PSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyxcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0XHQpLnZhbChcblx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3ZpZXdlcixcblx0XHRcdFx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0XHQpLmRhdGEoJ2RlZmF1bHQteWVhcmx5Jylcblx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeSA9PSAxMikge1xuXHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyXG5cdFx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdFx0KS52YWwoXG5cdFx0XHRcdFx0XHRcdFx0XHQkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF92aWV3ZXIsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCctJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdkZWZhdWx0LW1vbnRobHknKVxuXHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgK1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyICtcblx0XHRcdFx0XHRcdFx0XHRcdCdcIl0nXG5cdFx0XHRcdFx0XHRcdCkudmFsKCk7XG5cblx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeSxcblx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnNcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koXG5cdFx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyxcblx0XHRcdFx0XHRcdFx0XHRsZXZlbC5uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQsXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChcblx0XHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLFxuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdFx0KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdFx0XHRcdFx0KS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQodGhpcylcblx0XHRcdFx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbChcblx0XHRcdFx0XHRcdFx0XHRcdFx0YW1vdW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcmVxdWVuY3ksXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25zXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyhcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyxcblx0XHRcdFx0XHRcdFx0bGV2ZWwubmFtZSxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoJChvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzKS5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdCQob3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCkuY2xpY2soXG5cdFx0XHRcdFx0ZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdGVsZW1lbnRcblx0XHRcdFx0XHRcdCkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0JChcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3Rvcixcblx0XHRcdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHRcdFx0KS5yZW1vdmVDbGFzcygnZmxpcHBlZCcpO1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdFx0XHQnYWN0aXZlJ1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KVxuXHRcdFx0XHRcdFx0XHQuY2xvc2VzdChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKVxuXHRcdFx0XHRcdFx0XHQuYWRkQ2xhc3MoJ2ZsaXBwZWQnKTtcblx0XHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKFxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsXG5cdFx0XHRcdFx0XHRcdCQodGhpcykucGFyZW50KClcblx0XHRcdFx0XHRcdCkudmFsKCk7XG5cdFx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoXG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArXG5cdFx0XHRcdFx0XHRcdFx0J1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgK1xuXHRcdFx0XHRcdFx0XHRcdCdcIl0nXG5cdFx0XHRcdFx0XHQpLnZhbCgpO1xuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoXG5cdFx0XHRcdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSxcblx0XHRcdFx0XHRcdFx0ZWxlbWVudCxcblx0XHRcdFx0XHRcdFx0b3B0aW9uc1xuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWwoYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdGNvbnN0IGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoXG5cdFx0XHRcdGFtb3VudCxcblx0XHRcdFx0ZnJlcXVlbmN5LFxuXHRcdFx0XHR0eXBlXG5cdFx0XHQpO1xuXG5cdFx0XHQkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRpZiAoJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWwubmFtZSkge1xuXHRcdFx0XHRcdCQob3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyhcblx0XHRcdFx0XHRcdCdhY3RpdmUnXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5KHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bGV0IHJhbmdlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbW9udGhfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnbW9udGgnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IHllYXJfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQneWVhcidcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3Qgb25jZV92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdvbmUtdGltZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdGNvbnN0IGZyZXF1ZW5jeSA9IHBhcnNlSW50KHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSk7XG5cblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMpLnZhbChzZWxlY3RlZCk7XG5cdFx0XHRcdCQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzKS5wcm9wKFxuXHRcdFx0XHRcdCdzZWxlY3RlZCcsXG5cdFx0XHRcdFx0c2VsZWN0ZWRcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5yZW1vdmVDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicpIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJykge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuYWRkQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS50ZXh0KHJhbmdlKTtcblx0XHRcdFx0JChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoXG5cdFx0XHRcdFx0J2ZyZXF1ZW5jeScsXG5cdFx0XHRcdFx0ZnJlcXVlbmN5XG5cdFx0XHRcdCk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3KHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucykge1xuXHRcdFx0JChvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0bGV0IHJhbmdlID0gJChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbW9udGhfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQnbW9udGgnXG5cdFx0XHRcdCk7XG5cdFx0XHRcdGNvbnN0IHllYXJfdmFsdWUgPSAkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkuZGF0YShcblx0XHRcdFx0XHQneWVhcidcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3Qgb25jZV92YWx1ZSA9ICQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5kYXRhKFxuXHRcdFx0XHRcdCdvbmUtdGltZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0Y29uc3QgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkucmVtb3ZlQ2xhc3MoJ3NtYWxsZXInKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQob3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpKS5hZGRDbGFzcygnc21hbGxlcicpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScpIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JChvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykpLmFkZENsYXNzKCdzbWFsbGVyJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSkudGV4dChyYW5nZSk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrKGVsZW1lbnQsIG9wdGlvbnMpIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y29uc3QgbGV2ZWxfY2xhc3MgPSAkKHRoaXMpLnByb3AoJ2NsYXNzJyk7XG5cdFx0XHRcdGNvbnN0IGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKFxuXHRcdFx0XHRcdCdmbGlwcGVkJ1xuXHRcdFx0XHQpO1xuXHRcdFx0XHQkKG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoXG5cdFx0XHRcdFx0J2FjdGl2ZSdcblx0XHRcdFx0KTtcblx0XHRcdFx0JChcblx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsXG5cdFx0XHRcdFx0ZWxlbWVudFxuXHRcdFx0XHQpLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFx0JChcblx0XHRcdFx0XHRvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgK1xuXHRcdFx0XHRcdFx0Jy0nICtcblx0XHRcdFx0XHRcdGxldmVsX251bWJlciArXG5cdFx0XHRcdFx0XHQnICcgK1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvclxuXHRcdFx0XHQpLmFkZENsYXNzKCdmbGlwcGVkJyk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCEkLmRhdGEodGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSkpIHtcblx0XHRcdFx0JC5kYXRhKHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4odGhpcywgb3B0aW9ucykpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXApO1xuIl19
}(jQuery));
