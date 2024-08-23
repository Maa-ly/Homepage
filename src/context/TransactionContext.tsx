import React, { useEffect, useState, ReactNode, ChangeEvent } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";

// Define the context type
interface TransactionContextType {
    transactionCount: number | null;
    connectWallet: () => Promise<void>;
    transactions: Transaction[];
    currentAccount: string;
    isLoading: boolean;
    sendTransaction: () => Promise<void>;
    handleChange: (e: ChangeEvent<HTMLInputElement>, name: string) => void;
    formData: FormDataType;
}

// Define transaction structure
interface Transaction {
    addressTo: string;
    addressFrom: string;
    timestamp: string;
    message: string;
    keyword: string;
    amount: number;
}

// Define form data structure
interface FormDataType {
    addressTo: string;
    amount: string;
    keyword: string;
    message: string;
}

// Create the context with the defined type
export const TransactionContext = React.createContext<TransactionContextType | undefined>(undefined);

const { ethereum } = window as any;

// Create Ethereum contract instance
const createEthereumContract = (): ethers.Contract => {
    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();
    const transactionsContract = new ethers.Contract(contractAddress, contractABI, signer);

    return transactionsContract;
};

// Define the TransactionsProvider props
interface TransactionsProviderProps {
    children: ReactNode;
}

export const TransactionsProvider = ({ children }: TransactionsProviderProps) => {
    const [formData, setFormData] = useState<FormDataType>({
        addressTo: "",
        amount: "",
        keyword: "",
        message: ""
    });
    const [currentAccount, setCurrentAccount] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [transactionCount, setTransactionCount] = useState<number | null>(
        Number(localStorage.getItem("transactionCount"))
    );
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>, name: string) => {
        setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
    };

    const getAllTransactions = async () => {
        try {
            if (ethereum) {
                const transactionsContract = createEthereumContract();

                const availableTransactions = await transactionsContract.getAllTransactions();

                const structuredTransactions: Transaction[] = availableTransactions.map((transaction: any) => ({
                    addressTo: transaction.receiver,
                    addressFrom: transaction.sender,
                    timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
                    message: transaction.message,
                    keyword: transaction.keyword,
                    amount: parseInt(transaction.amount._hex) / 10 ** 18
                }));

                setTransactions(structuredTransactions);
            } else {
                console.log("Ethereum is not present");
            }
        } catch (error) {
            console.log(error);
        }
    };

    const checkIfWalletIsConnect = async () => {
        try {
            if (!ethereum) return alert("Please install MetaMask.");

            const accounts = await ethereum.request({ method: "eth_accounts" });

            if (accounts.length) {
                setCurrentAccount(accounts[0]);

                getAllTransactions();
            } else {
                console.log("No accounts found");
            }
        } catch (error) {
            console.log(error);
        }
    };

    const checkIfTransactionsExists = async () => {
        try {
            if (ethereum) {
                const transactionsContract = createEthereumContract();
                const currentTransactionCount = await transactionsContract.getTransactionCount();

                window.localStorage.setItem("transactionCount", currentTransactionCount.toString());
                setTransactionCount(currentTransactionCount.toNumber());
            }
        } catch (error) {
            console.log(error);

            throw new Error("No ethereum object");
        }
    };

    const connectWallet = async () => {
        try {
            if (!ethereum) return alert("Please install MetaMask.");

            const accounts = await ethereum.request({ method: "eth_requestAccounts" });

            setCurrentAccount(accounts[0]);
            window.location.reload();
        } catch (error) {
            console.log(error);

            throw new Error("No ethereum object");
        }
    };

    const sendTransaction = async () => {
        try {
            if (ethereum) {
                const { addressTo, amount, keyword, message } = formData;
                const transactionsContract = createEthereumContract();
                const parsedAmount = ethers.utils.parseEther(amount);

                await ethereum.request({
                    method: "eth_sendTransaction",
                    params: [{
                        from: currentAccount,
                        to: addressTo,
                        gas: "0x5208", // 21000 GWEI
                        value: parsedAmount._hex,
                    }],
                });

                const transactionHash = await transactionsContract.addToBlockchain(addressTo, parsedAmount, message, keyword);

                setIsLoading(true);
                console.log(`Loading - ${transactionHash.hash}`);
                await transactionHash.wait();
                console.log(`Success - ${transactionHash.hash}`);
                setIsLoading(false);

                const transactionsCount = await transactionsContract.getTransactionCount();

                setTransactionCount(transactionsCount.toNumber());
                window.location.reload();
            } else {
                console.log("No ethereum object");
            }
        } catch (error) {
            console.log(error);

            throw new Error("No ethereum object");
        }
    };

    useEffect(() => {
        checkIfWalletIsConnect();
        checkIfTransactionsExists();
    }, [transactionCount]);

    return (
        <TransactionContext.Provider
            value={{
                transactionCount,
                connectWallet,
                transactions,
                currentAccount,
                isLoading,
                sendTransaction,
                handleChange,
                formData,
            }}
        >
            {children}
        </TransactionContext.Provider>
    );
};
