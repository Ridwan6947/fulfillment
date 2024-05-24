import { translate } from '@hotwax/dxp-components';
import store from '@/store';
import { JsonToCsvOption } from '@/types';
import { Plugins } from '@capacitor/core';
import { toastController } from '@ionic/vue';
import { saveAs } from 'file-saver';
import { DateTime } from 'luxon';
import Papa from 'papaparse';
import Encoding from 'encoding-japanese';

// TODO Use separate files for specific utilities

// TODO Remove it when HC APIs are fully REST compliant
const hasError = (response: any) => {
  return typeof response.data != "object" || !!response.data._ERROR_MESSAGE_ || !!response.data._ERROR_MESSAGE_LIST_ || !!response.data.error;
}

const showToast = async (message: string, options?: any) => {  
  const config = {
    message,
    ...options
  } as any;

  if (!options?.position) {
    config.position = 'bottom';
  }
  if (options?.canDismiss) {
    config.buttons = [
      {
        text: translate('Dismiss'),
        role: 'cancel',
      },
    ]
  }
  if (!options?.manualDismiss) {
    config.duration = 3000;
  }

  const toast = await toastController.create(config)
  // present toast if manual dismiss is not needed
  return !options?.manualDismiss ? toast.present() : toast
}

const handleDateTimeInput = (dateTimeValue: any) => {
  // TODO Handle it in a better way
  // Remove timezone and then convert to timestamp
  // Current date time picker picks browser timezone and there is no supprt to change it
  const dateTime = DateTime.fromISO(dateTimeValue, { setZone: true}).toFormat("yyyy-MM-dd'T'HH:mm:ss")
  return DateTime.fromISO(dateTime).toMillis()
}

const formatDate = (value: any, inFormat?: string, outFormat?: string) => {
  // TODO Make default format configurable and from environment variables
  if(inFormat){
    return DateTime.fromFormat(value, inFormat).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
  }
  return DateTime.fromISO(value).toFormat(outFormat ? outFormat : 'MM-dd-yyyy');
}

const formatUtcDate = (value: any, outFormat: string) => {
  // TODO Make default format configurable and from environment variables
  // TODO Fix this setDefault should set the default timezone instead of getting it everytiem and setting the tz
  return DateTime.fromISO(value, { zone: 'utc' }).setZone(store.state.user.current.userTimeZone).toFormat(outFormat ? outFormat : 'MM-dd-yyyy')
}

const getFeature = (featureHierarchy: any, featureKey: string) => {
  let  featureValue = ''
  if (featureHierarchy) {
    const feature = featureHierarchy.find((featureItem: any) => featureItem.startsWith(featureKey))
    const featureSplit = feature ? feature.split('/') : [];
    featureValue = featureSplit[2] ? featureSplit[2] : '';
  }
  return featureValue;
}

const parseCsv = async (file: File, options?: any) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results: any) {
        if (results.errors.length) {
          reject(results.error)
        } else {
          resolve(results.data)
        }
      },
      ...options
    });
  })
}

const jsonToCsv = (file: any, options: JsonToCsvOption = {}) => {
  const csv = Papa.unparse(file, {
    ...options.parse
  });
  const encoding = {
    type: String,
    default: "utf-8",
    ...options.encode
  };

  let buffer: Uint8Array;
  let blob: Blob;
  if (encoding.default === 'shift-jis') {
    buffer = new Uint8Array(Encoding.convert(Encoding.stringToCode(csv), 'SJIS'));
    blob = new Blob([buffer], { type: `application/csv;charset=${encoding.default}` });
    
  } else {
    blob = new Blob([csv], { type: `application/csv;charset=${encoding.default}` });
  }

  if (options.download) {
    saveAs(blob, options.name ? options.name : "default.csv");
  }
  return blob;
}

const copyToClipboard = async (value: string, text?: string) => {
  const { Clipboard } = Plugins;

  await Clipboard.write({
    string: value,
  }).then(() => {
    text ? showToast(translate(text)) : showToast(translate("Copied", { value }));
  });
}

const getIdentificationId = (identifications: any, id: string) => {
  let  externalId = ''
  if (identifications) {
    const externalIdentification = identifications.find((identification: any) => identification.startsWith(id))
    const externalIdentificationSplit = externalIdentification ? externalIdentification.split('/') : [];
    externalId = externalIdentificationSplit[1] ? externalIdentificationSplit[1] : '';
  }
  return externalId;
}

const formatPhoneNumber = (countryCode: string | null, areaCode: string | null, contactNumber: string | null)  => {
  if (countryCode && areaCode) {
    return `+${countryCode}-${areaCode}-${contactNumber}`;
  } else if (countryCode) {
    return `+${countryCode}-${contactNumber}`;
  } else {
    return contactNumber;
  }
}


const generateInternalId = (name: string) => {
  return name.trim().toUpperCase().split(' ').join('_');
}

const sortItems = (items: any, sortByField: any) => {
  items.sort((firstMethod:any, secondMethod:any) => {
    if (firstMethod[sortByField] === null && secondMethod[sortByField] !== null) {
        return 1;
    } else if (firstMethod[sortByField] !== null && secondMethod[sortByField] === null) {
        return -1;
    } else {
        return firstMethod[sortByField] - secondMethod[sortByField];
    }
  });
}

const isValidDeliveryDays = (deliveryDays : any) => {
  // Regular expression pattern for a valid delivery days
  const delieveryDaysPattern = /^(\d*\.?\d+)?$/;
  return delieveryDaysPattern.test(deliveryDays);
}

const isValidCarrierCode = (trackingCode : any) => {
  // Regular expression pattern for a valid tracking code
  const trackingCodePattern = /^[a-zA-Z0-9]*$/;
  return trackingCodePattern.test(trackingCode);
}

const currentSymbol: any = {
  "USD": "$",
  "EUR": "€",
  "JPY": "¥"
}

const formatCurrency = (amount: any, code: string) => {
  return `${currentSymbol[code] || code} ${amount}`
}

const getColorByDesc = (desc: string) => ({
  "Approved": "primary",
  "Authorized": "medium",
  "Cancelled": "danger",
  "Completed": "success",
  "Created": "medium",
  "Declined": "danger",
  "Held": "warning",
  "Not-Authorized": "warning",
  "Not-Received": "warning",
  "Pending": "warning",
  "Received": "success",
  "Refunded": "success",
  "Settled": "success",
  "default": "medium"
} as any)[desc]


export { copyToClipboard, formatCurrency, formatDate, formatPhoneNumber, formatUtcDate, generateInternalId, getColorByDesc, getFeature, getIdentificationId, handleDateTimeInput, isValidDeliveryDays, isValidCarrierCode, showToast, sortItems, hasError, parseCsv, jsonToCsv }
